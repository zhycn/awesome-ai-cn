#!/usr/bin/env python3
"""校验 config/*.json 与 data/*.json 是否符合项目规范。

条目字段的约束来自 config/schema.json（改 schema 即生效）；
跨条目的规则（id/URL/名称查重、featured 上限、主题文件名、日期语义）在本文件实现。

用法:
    python3 scripts/validate.py          # 全部校验
    python3 scripts/validate.py --quiet  # 只输出问题

退出码:
    0 通过
    1 存在错误
"""

from __future__ import annotations

import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config"
DATA = ROOT / "data"

OK = "✔"
BAD = "✘"
WARN = "▲"

MAX_ITEMS_PER_MODULE = 120
MAX_FEATURED_PER_MODULE = 3

ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URL_RE = re.compile(r"^https?://[^\s]+$")


def rel(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"{where}: {msg}")

    @property
    def ok(self) -> bool:
        return not self.errors


_FAILED = object()  # 读取失败；与 JSON null（返回 None）区分开


def load_json(path: Path, report: Report) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        report.error(rel(path), "文件不存在")
    except UnicodeDecodeError as exc:
        report.error(rel(path), f"不是合法的 UTF-8 文件：{exc}")
    except OSError as exc:
        report.error(rel(path), f"读取失败：{exc}")
    except json.JSONDecodeError as exc:
        report.error(
            rel(path),
            f"JSON 语法错误：第 {exc.lineno} 行第 {exc.colno} 列，{exc.msg}",
        )
    return _FAILED


# ---------------------------------------------------------------- schema 校验


def check_value(value: Any, spec: dict[str, Any], where: str, report: Report) -> None:
    """按 schema 片段校验一个值，只覆盖本项目实际用到的关键字。"""
    expected = spec.get("type")
    if expected == "string":
        if not isinstance(value, str):
            report.error(where, f"应为字符串，实际是 {type(value).__name__}")
            return
        if "minLength" in spec and len(value) < spec["minLength"]:
            report.error(where, f"太短，至少 {spec['minLength']} 字（当前 {len(value)}）")
        if "maxLength" in spec and len(value) > spec["maxLength"]:
            report.error(where, f"太长，最多 {spec['maxLength']} 字（当前 {len(value)}）")
        if "pattern" in spec and not re.fullmatch(spec["pattern"], value):
            report.error(where, f"格式不符，应匹配 {spec['pattern']}：{value!r}")
    elif expected == "array":
        if not isinstance(value, list):
            report.error(where, f"应为数组，实际是 {type(value).__name__}")
            return
        if "minItems" in spec and len(value) < spec["minItems"]:
            report.error(where, f"条目太少，至少 {spec['minItems']} 个（当前 {len(value)}）")
        if "maxItems" in spec and len(value) > spec["maxItems"]:
            report.error(where, f"条目太多，最多 {spec['maxItems']} 个（当前 {len(value)}）")
        if spec.get("uniqueItems") and len(set(map(repr, value))) != len(value):
            report.error(where, "存在重复项")
        child = spec.get("items")
        if isinstance(child, dict):
            for i, v in enumerate(value):
                check_value(v, child, f"{where}[{i}]", report)
    elif expected == "object":
        if not isinstance(value, dict):
            report.error(where, f"应为对象，实际是 {type(value).__name__}")
            return
        props = spec.get("properties", {})
        for key in spec.get("required", []):
            if key not in value:
                report.error(where, f"缺少必填字段 {key!r}")
        if spec.get("additionalProperties") is False:
            for key in value:
                if key not in props:
                    report.error(where, f"未知字段 {key!r}（拼写错误或规范未定义）")
        for key, child in props.items():
            if key in value:
                check_value(value[key], child, f"{where}.{key}", report)
    elif expected == "boolean":
        if not isinstance(value, bool):
            report.error(where, f"应为布尔值，实际是 {type(value).__name__}")

    if "enum" in spec and value not in spec["enum"]:
        report.error(where, f"取值非法 {value!r}，只能是 {spec['enum']}")


# ---------------------------------------------------------------- 语义校验


def check_item_semantics(item: dict[str, Any], where: str, report: Report) -> None:
    for key in ("name", "desc", "vendor"):
        value = item.get(key)
        if isinstance(value, str) and ("\n" in value or "\r" in value):
            report.error(f"{where}.{key}", "不能包含换行（会破坏 README 渲染）")

    desc = item.get("desc")
    if isinstance(desc, str):
        if desc.endswith("。"):
            report.warn(where + ".desc", "结尾不要加句号")
        if desc.endswith(("！", "!", "~")):
            report.warn(where + ".desc", "避免感叹号，保持陈述语气")

    url = item.get("url")
    if isinstance(url, str) and URL_RE.fullmatch(url):
        if not urlsplit(url).netloc:
            report.error(where + ".url", f"缺少域名：{url}")

    added = item.get("added")
    if isinstance(added, str) and DATE_RE.fullmatch(added):
        try:
            if date.fromisoformat(added) > date.today():
                report.warn(where + ".added", f"收录日期 {added} 在未来")
        except ValueError:
            report.error(where + ".added", f"不是合法日期：{added}")


def normalize_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit(
        (parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), parts.query, "")
    )


# ---------------------------------------------------------------- 主流程


def main(argv: list[str]) -> int:
    quiet = "--quiet" in argv
    report = Report()
    lines: list[str] = []

    # 1. 配置
    meta = load_json(CONFIG / "meta.json", report)
    categories_doc = load_json(CONFIG / "categories.json", report)
    schema = load_json(CONFIG / "schema.json", report)

    if isinstance(meta, dict):
        for key in ("name", "tagline", "description", "repo"):
            if not meta.get(key):
                report.error(rel(CONFIG / "meta.json"), f"缺少字段 {key!r}（build.py 依赖它）")
    elif meta is not None:
        report.error(rel(CONFIG / "meta.json"), "顶层应为对象")

    if not isinstance(schema, dict) or "$defs" not in schema:
        report.error(rel(CONFIG / "schema.json"), "缺少 $defs 定义")
        schema = None
    item_spec = schema.get("$defs", {}).get("item") if schema else None
    if schema and not isinstance(item_spec, dict):
        report.error(rel(CONFIG / "schema.json"), "缺少 $defs.item 定义")
        item_spec = None

    categories: list[dict[str, Any]] = []
    if isinstance(categories_doc, dict):
        raw = categories_doc.get("categories")
        if not isinstance(raw, list) or not raw:
            report.error(rel(CONFIG / "categories.json"), "categories 必须是非空数组（至少一个主题）")
        else:
            categories = raw
    elif categories_doc is not _FAILED and categories_doc is not None:
        report.error(rel(CONFIG / "categories.json"), "顶层应为对象，且包含 categories 数组")

    seen_ids: set[str] = set()
    seen_files: set[str] = set()
    for i, cat in enumerate(categories):
        where = f"{rel(CONFIG / 'categories.json')} categories[{i}]"
        if not isinstance(cat, dict):
            report.error(where, "应为对象")
            continue
        for key in ("id", "title", "file"):
            if not cat.get(key):
                report.error(where, f"缺少 {key!r}")
        cid = cat.get("id")
        if not isinstance(cid, str):
            if cid is not None:
                report.error(where, f"id 应为字符串，实际是 {type(cid).__name__}")
            cid = ""
        if cid and not ID_RE.fullmatch(cid):
            report.error(where, f"id 需为小写连字符：{cid!r}")
        if cid in seen_ids:
            report.error(where, f"id 重复：{cid!r}")
        seen_ids.add(cid)
        filename = cat.get("file")
        if not isinstance(filename, str):
            if filename is not None:
                report.error(where, f"file 应为字符串，实际是 {type(filename).__name__}")
            filename = ""
        if filename and not filename.endswith(".json"):
            report.error(where, f"file 需以 .json 结尾：{filename!r}")
        if filename and ("/" in filename or "\\" in filename or filename.startswith(".")):
            report.error(where, f"file 只能是 data/ 下的文件名，不能含路径：{filename!r}")
        if cid and filename and filename != f"{cid}.json":
            report.error(where, f"file 应为 <id>.json：期望 {cid}.json，实际 {filename!r}")
        if filename in seen_files:
            report.error(where, f"file 重复：{filename!r}")
        seen_files.add(filename)

    registered = {c.get("file"): c for c in categories if isinstance(c, dict)}

    # 2. 数据
    item_ids: dict[str, str] = {}
    item_urls: dict[str, str] = {}
    item_names: dict[tuple[str, str], str] = {}
    module_count = 0
    item_count = 0

    if not DATA.is_dir():
        report.error(rel(DATA), "目录不存在")
    else:
        for path in sorted(DATA.glob("*.json")):
            body = load_json(path, report)
            if body is _FAILED:
                continue
            if body is None:
                report.error(rel(path), "顶层不能为 null，应为条目数组")
                continue
            module_count += 1
            if path.name not in registered:
                report.error(
                    rel(path),
                    "该文件未在 config/categories.json 中注册，请先添加主题",
                )
                continue
            if not isinstance(body, list):
                report.error(rel(path), "顶层应为数组（条目列表）")
                continue

            featured = 0
            for i, item in enumerate(body):
                where = f"{rel(path)}[{i}]"
                if item_spec:
                    check_value(item, item_spec, where, report)
                if not isinstance(item, dict):
                    continue
                item_count += 1
                check_item_semantics(item, where, report)

                if item.get("featured"):
                    featured += 1

                iid = item.get("id")
                if isinstance(iid, str):
                    if iid in item_ids:
                        report.error(where + ".id", f"id 全局重复：{iid!r}（首次出现于 {item_ids[iid]}）")
                    else:
                        item_ids[iid] = where
                name = item.get("name")
                if isinstance(name, str) and name:
                    key = (path.name, name.lower())
                    if key in item_names:
                        report.error(where + ".name", f"同一主题内名称重复：{name!r}")
                    else:
                        item_names[key] = where
                url = item.get("url")
                if isinstance(url, str) and URL_RE.fullmatch(url):
                    norm = normalize_url(url)
                    if norm in item_urls:
                        report.error(where + ".url", f"链接重复：{url}（已收录于 {item_urls[norm]}）")
                    else:
                        item_urls[norm] = where

            if featured > MAX_FEATURED_PER_MODULE:
                report.error(
                    rel(path),
                    f"featured 条目 {featured} 条，超过上限 {MAX_FEATURED_PER_MODULE}",
                )
            if len(body) > MAX_ITEMS_PER_MODULE:
                report.warn(rel(path), f"条目 {len(body)} 条，建议拆分为子主题（阈值 {MAX_ITEMS_PER_MODULE}）")

    # 3. 输出
    if not quiet:
        lines.append("配置")
        def mark(path: Path, label: str) -> str:
            bad = any(e.startswith(rel(path)) for e in report.errors)
            return f"  {BAD} {label}" if bad else f"  {OK} {label}"

        lines.append(mark(CONFIG / "meta.json", "config/meta.json"))
        lines.append(mark(CONFIG / "categories.json", f"config/categories.json（{len(categories)} 个主题）"))
        lines.append(mark(CONFIG / "schema.json", "config/schema.json"))
        lines.append("")
        lines.append("数据")
        lines.append(f"  {OK} {module_count} 个模块 / {item_count} 条条目")
        missing = [c.get("file") for c in categories if isinstance(c, dict) and c.get("file") not in {
            p.name for p in DATA.glob("*.json")
        }]
        if missing:
            lines.append(f"  {WARN} 尚未收录内容的主题：{len(missing)} 个")
        lines.append("")

    for w in report.warnings:
        lines.append(f"{WARN} {w}")
    for e in report.errors:
        lines.append(f"{BAD} {e}")

    if report.errors:
        lines.append("")
        lines.append(f"{BAD} 未通过：{len(report.errors)} 个错误，{len(report.warnings)} 个建议")
    else:
        lines.append("")
        lines.append(f"{OK} 通过：0 个错误，{len(report.warnings)} 个建议")

    print("\n".join(lines))
    return 0 if report.ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
