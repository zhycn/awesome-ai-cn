#!/usr/bin/env python3
"""由 config/ 与 data/ 生成 README.md。

数据流向：
    config/meta.json + config/categories.json + data/<category>.json
        └─> scripts/build.py  ──> README.md（生成物，请勿手改）

用法:
    python3 scripts/build.py           # 生成 README.md
    python3 scripts/build.py --check   # 只比对，不写文件；不一致则退出码 1（CI 用）
"""

from __future__ import annotations

import difflib
import json
import re
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
CONFIG = ROOT / "config"
DATA = ROOT / "data"
README = ROOT / "README.md"

# 只在 README 中展示这两个状态；deprecated / archived 保留在数据里供机器读取
VISIBLE_STATUS = {"active", "beta"}

HEADER = """<!-- 本文件由 scripts/build.py 自动生成，请勿直接编辑；修改 data/*.json 后重新运行即可。 -->

# {name}

[![Awesome](https://awesome.re/badge.svg)](https://awesome.re)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI]({repo}/actions/workflows/ci.yml/badge.svg)]({repo}/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> {tagline}

{description}
"""

EMPTY_HINT = "> 内容正在收录中，首批资源即将上线。\n"

FOOTER = """## 收录说明

- 本文件由 [`scripts/build.py`](scripts/build.py) 自动生成，请勿直接编辑；修正内容请改 `data/` 下对应的 JSON，再运行 `python3 scripts/build.py`。
- 新增或修正条目请先读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。
- 字段定义、写作口吻与排序规则见 [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md)。
- 数据以 JSON 为唯一事实源，可被程序或 Agent 直接消费；结构定义见 [`config/schema.json`](config/schema.json)。

## License

[MIT](LICENSE) © zhycn
"""


def load(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise SystemExit(f"✘ 缺少文件：{path.relative_to(ROOT)}")
    except json.JSONDecodeError as exc:
        raise SystemExit(
            f"✘ {path.relative_to(ROOT)} 解析失败：第 {exc.lineno} 行第 {exc.colno} 列，{exc.msg}"
        )


def slugify(text: str) -> str:
    """复刻 GitHub 标题锚点规则：小写、去掉符号、空格换连字符。

    标题刻意不含 emoji，保证中英文标题的锚点稳定可预测。
    """
    text = text.strip().lower()
    text = re.sub(r"[^\w\- ]", "", text)  # \w 覆盖中文、字母、数字、下划线
    return text.replace(" ", "-")


def visible_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [i for i in items if i.get("status", "active") in VISIBLE_STATUS]


def item_line(item: dict[str, Any]) -> str:
    star = "⭐ " if item.get("featured") else ""  # 仅作强调，不改变顺序
    tags = " ".join(f"`{t}`" for t in item.get("tags", []))
    line = f"- {star}[{item['name']}]({item['url']}) - {item['desc']}"
    if tags:
        line += f" {tags}"
    return line


def render() -> tuple[str, int, int]:
    meta = load(CONFIG / "meta.json")
    categories = load(CONFIG / "categories.json").get("categories", [])

    toc: list[str] = []
    sections: list[str] = []
    total = 0
    used_anchors: dict[str, int] = {}

    for cat in categories:
        path = DATA / cat["file"]
        items = visible_items(load(path)) if path.exists() else []
        if not items:
            continue

        heading = cat["title"]
        anchor = slugify(heading)
        if anchor in used_anchors:  # 理论上不会发生，兜底
            used_anchors[anchor] += 1
            anchor = f"{anchor}-{used_anchors[anchor]}"
        else:
            used_anchors[anchor] = 0

        emoji = f"{cat['emoji']} " if cat.get("emoji") else ""
        toc.append(f"- [{emoji}{heading}](#{anchor})（{len(items)}）")

        total += len(items)
        body = "\n".join(item_line(i) for i in items)
        desc = cat.get("description", "").strip()
        section = f"## {heading}\n"
        if desc:
            section += f"\n> {desc}\n"
        section += f"\n{body}\n"
        sections.append(section)

    parts = [
        HEADER.format(
            name=meta["name"],
            tagline=meta["tagline"],
            description=meta["description"],
            repo=meta["repo"].rstrip("/"),
        )
    ]

    if toc:
        parts.append(f"共 **{len(toc)}** 个主题、**{total}** 条资源。\n")
        parts.append("## 目录\n\n" + "\n".join(toc) + "\n")
        parts.append("\n".join(sections))
    else:
        parts.append(EMPTY_HINT)

    parts.append(FOOTER)
    return "\n".join(parts).rstrip() + "\n", len(sections), total


def main(argv: list[str]) -> int:
    check = "--check" in argv
    content, section_count, total = render()

    if check:
        current = README.read_text(encoding="utf-8") if README.exists() else ""
        if current == content:
            print("✔ README.md 与数据一致")
            return 0
        diff = list(
            difflib.unified_diff(
                current.splitlines(),
                content.splitlines(),
                fromfile="README.md（当前）",
                tofile="README.md（应为）",
                lineterm="",
            )
        )
        print("✘ README.md 与 data/ 不一致，请运行 python3 scripts/build.py")
        for line in diff[:40]:
            print(line)
        if len(diff) > 40:
            print(f"... 其余 {len(diff) - 40} 行差异省略")
        return 1

    if README.exists() and README.read_text(encoding="utf-8") == content:
        print("✔ README.md 无变化")
        return 0

    README.write_text(content, encoding="utf-8")
    print(f"✔ 已生成 README.md（{section_count} 个主题分节 / {total} 条资源）")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
