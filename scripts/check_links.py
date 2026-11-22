#!/usr/bin/env python3
"""巡检 data/*.json 中的链接是否仍然可用。

探测优先使用 curl（部分站点会拦截 Python urllib 的 TLS 指纹，返回假的 404），
curl 不存在时回退到标准库。

默认跳过 deprecated / archived 条目：这些是已停更的历史数据，不该每周报警。

用法:
    python3 scripts/check_links.py
    python3 scripts/check_links.py --timeout 20 --workers 24 --include-archived

判定:
    2xx/3xx         可达
    403/429         可达但拒绝爬虫（告警，不算失效）
    其他 4xx/5xx    失效
    连接失败/超时    无法访问（可能是网络或站点下线）

退出码: 0 无失效链接；1 存在失效/不可达链接，或数据文件本身有问题
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

OK, BLOCKED, BROKEN, UNREACHABLE = "ok", "blocked", "broken", "unreachable"
HIDDEN_STATUS = {"deprecated", "archived"}
USE_CURL = shutil.which("curl") is not None


def _classify(code: int) -> str:
    if 200 <= code < 400:
        return OK
    if code in (403, 429):
        return BLOCKED
    if code == 0:
        return UNREACHABLE
    return BROKEN


def _probe_curl(url: str, timeout: float) -> tuple[str, str]:
    proc = subprocess.run(
        [
            "curl", "-sS", "-o", os.devnull, "-L",
            "--max-time", str(timeout),
            "--connect-timeout", "10",
            "--max-redirs", "10",
            "--max-filesize", "5242880",  # 5MB，避免把大文件整个拉下来
            "-A", UA,
            "-w", "%{http_code}",
            "--", url,  # -- 防止 URL 被当成命令行参数
        ],
        capture_output=True,
        text=True,
    )
    if proc.returncode == 63:  # 超过 max-filesize，说明站点有响应
        return OK, "200+"
    code = proc.stdout.strip()
    if not code.isdigit():
        return UNREACHABLE, (proc.stderr.strip().splitlines() or ["curl 失败"])[-1][:80]
    return _classify(int(code)), code


def _probe_urllib(url: str, timeout: float) -> tuple[str, str]:
    req = Request(url, headers={"User-Agent": UA, "Accept": "*/*"}, method="GET")
    try:
        with urlopen(req, timeout=timeout) as resp:
            resp.read(1024)
            return _classify(resp.status), str(resp.status)
    except HTTPError as exc:
        return _classify(exc.code), str(exc.code)
    except URLError as exc:
        return UNREACHABLE, str(exc.reason)[:80]
    except Exception as exc:  # noqa: BLE001 - 巡检要吞掉所有异常
        return UNREACHABLE, type(exc).__name__


def probe(url: str, timeout: float, attempts: int = 2) -> tuple[str, str]:
    state, detail = UNREACHABLE, ""
    for attempt in range(attempts):
        if attempt:
            time.sleep(1.5)  # 连接被重置时稍等再试，避免把网络抖动判成死链
        state, detail = _probe_curl(url, timeout) if USE_CURL else _probe_urllib(url, timeout)
        if state != UNREACHABLE:
            return state, detail
    return state, detail


def collect_targets(include_archived: bool) -> tuple[list[tuple[str, str, str]], list[str]]:
    """返回 (待探测列表, 数据层错误)。数据有问题时要显式失败，不能假绿。"""
    errors: list[str] = []
    targets: list[tuple[str, str, str]] = []
    seen: set[str] = set()

    if not DATA.is_dir():
        return [], [f"数据目录不存在：{DATA.name}/"]

    files = sorted(DATA.glob("*.json"))
    if not files:
        return [], ["data/ 下没有任何 *.json 文件"]

    for path in files:
        try:
            body = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"{path.name}: JSON 语法错误（第 {exc.lineno} 行）")
            continue
        except OSError as exc:
            errors.append(f"{path.name}: 读取失败（{exc}）")
            continue

        if not isinstance(body, list):
            errors.append(f"{path.name}: 顶层应为条目数组")
            continue

        for index, item in enumerate(body):
            if not isinstance(item, dict):
                errors.append(f"{path.name}[{index}]: 条目应为对象")
                continue
            if not include_archived and item.get("status") in HIDDEN_STATUS:
                continue
            name, url = item.get("name"), item.get("url")
            if not isinstance(name, str) or not isinstance(url, str) or not url:
                errors.append(f"{path.name}[{index}]: 缺少 name 或 url")
                continue
            key = url.rstrip("/")
            if key in seen:  # 同一 URL 只探一次
                continue
            seen.add(key)
            targets.append((path.stem, name, url))

    return targets, errors


def main() -> int:
    parser = argparse.ArgumentParser(description="巡检链接可用性")
    parser.add_argument("--timeout", type=float, default=15.0)
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--include-archived", action="store_true", help="连已归档条目一起检查")
    args = parser.parse_args()

    targets, data_errors = collect_targets(args.include_archived)

    if data_errors:
        print("数据检查未通过：")
        for err in data_errors:
            print(f"  ✘ {err}")
        return 1

    if not targets:
        print("没有需要检查的链接")
        return 0

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        results = list(pool.map(lambda t: (t, *probe(t[2], args.timeout)), targets))

    problems = [(t, state, detail) for t, state, detail in results if state != OK]
    failed = [p for p in problems if p[1] in (BROKEN, UNREACHABLE)]

    by_state: dict[str, int] = {}
    for _, state, _ in results:
        by_state[state] = by_state.get(state, 0) + 1

    print(f"共检查 {len(targets)} 条链接（探测方式：{'curl' if USE_CURL else 'urllib'}）：")
    for state, label in ((OK, "可达"), (BLOCKED, "被拒绝"), (BROKEN, "失效"), (UNREACHABLE, "不可达")):
        if by_state.get(state):
            print(f"  {label}: {by_state[state]}")

    if problems:
        print("\n需要关注：")
        for (module, name, url), state, detail in sorted(problems, key=lambda x: x[1]):
            print(f"  [{state}] {module} / {name} -> {url} ({detail})")

    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
