#!/usr/bin/env python3
"""巡检 data/*.json 中的链接是否仍然可用。

探测优先使用 curl（部分站点会拦截 Python urllib 的 TLS 指纹，返回假的 404），
curl 不存在时回退到标准库。

用法:
    python3 scripts/check_links.py
    python3 scripts/check_links.py --timeout 20 --workers 24

判定:
    2xx/3xx         可达
    403/429         可达但拒绝爬虫（告警，不算失效）
    其他 4xx/5xx    失效
    连接失败/超时    无法访问（可能是网络或站点下线）

退出码: 0 无失效链接；1 存在失效或不可达链接
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"

OK, BLOCKED, BROKEN, UNREACHABLE = "ok", "blocked", "broken", "unreachable"
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
            "curl", "-sS", "-o", "/dev/null", "-L", "--max-time", str(timeout),
            "-A", UA, "-w", "%{http_code}", url,
        ],
        capture_output=True,
        text=True,
    )
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
    for _ in range(attempts):
        state, detail = _probe_curl(url, timeout) if USE_CURL else _probe_urllib(url, timeout)
        if state != UNREACHABLE:
            return state, detail
    return state, detail


def main() -> int:
    parser = argparse.ArgumentParser(description="巡检链接可用性")
    parser.add_argument("--timeout", type=float, default=15.0)
    parser.add_argument("--workers", type=int, default=16)
    args = parser.parse_args()

    targets: list[tuple[str, str, str]] = []
    for path in sorted(DATA.glob("*.json")):
        for item in json.loads(path.read_text(encoding="utf-8")):
            targets.append((path.stem, item["name"], item["url"]))

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
