#!/usr/bin/env node
/**
 * 由 config/ 与 data/ 生成 README.md。
 *
 * 用法:
 *   node scripts/build.ts           # 生成 README.md
 *   node scripts/build.ts --check   # 只比对，不写文件；不一致则退出码 1（CI 用）
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG_DIR = join(ROOT, "config");
const DATA_DIR = join(ROOT, "data");
const README_PATH = join(ROOT, "README.md");

/** 只在 README 中展示这两个状态；deprecated / archived 保留在数据里供机器读取 */
const VISIBLE_STATUS = new Set(["active", "beta"]);

const USAGE = `用法: node scripts/build.ts [--check]

  --check   只比对不写文件，不一致时退出码 1`;

type Item = Record<string, unknown> & {
  id: string;
  name: string;
  url: string;
  desc: string;
  tags?: string[];
  featured?: boolean;
  status?: string;
};

type Category = {
  id: string;
  title: string;
  file: string;
  emoji?: string;
  description?: string;
};

function rel(path: string): string {
  return relative(ROOT, path);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** 把 JSON.parse 的字符位置换算成行列，方便定位 */
function locate(text: string, position: number): { line: number; column: number } {
  const before = text.slice(0, position).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

function load(path: string): unknown {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") fail(`✘ 缺少文件：${rel(path)}`);
    fail(`✘ ${rel(path)} 读取失败：${(error as Error).message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = (error as Error).message;
    const match = /position (\d+)/.exec(message);
    if (match) {
      const { line, column } = locate(text, Number(match[1]));
      fail(`✘ ${rel(path)} 解析失败：第 ${line} 行第 ${column} 列，${message}`);
    }
    fail(`✘ ${rel(path)} 解析失败：${message}`);
  }
}

/** 复刻 GitHub 标题锚点规则：小写、去掉符号、空格换连字符。 */
function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .replace(/ /g, "-");
}

function visibleItems(items: Item[]): Item[] {
  return items.filter((item) => VISIBLE_STATUS.has(item.status ?? "active"));
}

/** 名称里的方括号会截断 Markdown 链接，需要转义。 */
function escapeLinkText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function itemLine(item: Item): string {
  const star = item.featured ? " ⭐" : ""; // 仅作强调，不改变顺序；放在名称后，避免行首不齐
  const proxy = item.access === "proxy" ? " 🌐" : ""; // 需科学上网
  const tags = (item.tags ?? []).map((tag) => `\`${tag}\``).join(" ");
  // 仅当 URL 含括号时用尖括号包裹（GitHub 已验证可渲染），避免无谓的源码噪音
  const target = item.url.includes("(") || item.url.includes(")") ? `<${item.url}>` : item.url;
  const line = `- [${escapeLinkText(item.name)}](${target})${star}${proxy} - ${item.desc}`;
  return tags ? `${line} ${tags}` : line;
}

function header(meta: Record<string, unknown>): string {
  const repo = String(meta.repo ?? "").replace(/\/$/, "");
  const license = String(meta.license ?? "MIT");
  return `<!-- 本文件由 scripts/build.ts 自动生成，请勿直接编辑；修改 data/*.json 后重新运行即可。 -->

<h1 align="center">${meta.name}</h1>

<p align="center">
  <a href="https://awesome.re"><img src="https://awesome.re/badge.svg" alt="Awesome"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-${encodeURIComponent(license)}-blue.svg" alt="License: ${license}"></a>
  <a href="${repo}/actions/workflows/ci.yml"><img src="${repo}/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome"></a>
</p>

<p align="center"><em>${meta.tagline}</em></p>

<p align="center">${meta.description}</p>
`;
}

const DEFAULT_FOOTER_NOTES = [
  "新增或修正条目请先读 [`CONTRIBUTING.md`](CONTRIBUTING.md)。",
  "字段定义、写作口吻与排序规则见 [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md)。",
];

type Copy = {
  emptyHint?: string;
  footerTitle?: string;
  footerNotes?: string[];
};

function readCopy(meta: Record<string, unknown>): Copy {
  const raw = meta.copy;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Copy) : {};
}

const OWNER_NOTE =
  "本文件由 [`scripts/build.ts`](scripts/build.ts) 自动生成，请勿直接编辑；修正内容请改 `data/` 下对应的 JSON，再运行 `npm run build`。";

function footer(meta: Record<string, unknown>): string {
  const copy = readCopy(meta);
  const license = String(meta.license ?? "MIT");
  const author = String(meta.author ?? "");
  const holder = author ? ` © ${author}` : "";
  const notes =
    Array.isArray(copy.footerNotes) && copy.footerNotes.length > 0
      ? copy.footerNotes
      : DEFAULT_FOOTER_NOTES;
  const bullets = [OWNER_NOTE, ...notes].map((note) => `- ${note}`).join("\n");
  return `## ${copy.footerTitle ?? "收录说明"}

${bullets}

## License

[${license}](LICENSE)${holder}
`;
}

function render(): { content: string; sectionCount: number; total: number } {
  const meta = load(join(CONFIG_DIR, "meta.json")) as Record<string, unknown>;
  const categoriesDoc = load(join(CONFIG_DIR, "categories.json")) as { categories?: Category[] };
  const categories = categoriesDoc.categories ?? [];

  const toc: string[] = [];
  const sections: string[] = [];
  let total = 0;
  let proxyCount = 0;
  // 预置固定标题的锚点，避免主题标题与「目录」「收录说明」「License」重名时跳错
  const usedAnchors = new Map<string, number>();
  for (const name of ["目录", "收录说明", "License"]) usedAnchors.set(slugify(name), 0);

  for (const cat of categories) {
    const path = join(DATA_DIR, cat.file);
    const raw = existsSync(path) ? load(path) : [];
    if (!Array.isArray(raw)) fail(`✘ ${rel(path)}: 顶层应为条目数组`);
    raw.forEach((item: unknown, index: number) => {
      const url = item && typeof item === "object" ? (item as Item).url : undefined;
      if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
        fail(`✘ ${rel(path)}[${index}]: 非 http(s) 链接 '${String(url)}'`);
      }
    });

    const items = visibleItems(raw as Item[]);
    if (items.length === 0) continue;

    const heading = cat.title;
    let anchor = slugify(heading) || cat.id; // 标题全是符号时回退到 id，避免空锚点
    if (usedAnchors.has(anchor)) {
      const next = (usedAnchors.get(anchor) ?? 0) + 1;
      usedAnchors.set(anchor, next);
      anchor = `${anchor}-${next}`;
    } else {
      usedAnchors.set(anchor, 0);
    }

    const emoji = cat.emoji ? `${cat.emoji} ` : "";
    toc.push(`- [${emoji}${heading}](#${anchor})（${items.length}）`);

    total += items.length;
    proxyCount += items.filter((item) => item.access === "proxy").length;
    const body = items.map(itemLine).join("\n");
    let section = `## ${heading}\n`;
    if (cat.description?.trim()) section += `\n*${cat.description.trim()}*\n`;
    section += `\n${body}\n`;
    sections.push(section);
  }

  const parts: string[] = [header(meta)];

  if (toc.length > 0) {
    parts.push(
      `<p align="center">共 <strong>${toc.length}</strong> 个主题、<strong>${total}</strong> 条资源。</p>\n`,
    );
    if (proxyCount > 0) {
      parts.push(`<p align="center">🌐 需要科学上网（${proxyCount} 条），其余可直接访问</p>\n`);
    }
    parts.push(`## 目录\n\n${toc.join("\n")}\n`);
    parts.push(sections.join("\n"));
  } else {
    const hint = readCopy(meta).emptyHint ?? "内容正在收录中。";
    parts.push(`*${hint}*\n`);
  }

  parts.push(footer(meta));
  const content = `${parts.join("\n").replace(/\s+$/, "")}\n`;
  return { content, sectionCount: sections.length, total };
}

/** 基于 LCS 的极简 unified diff，够定位 README 与数据的差异 */
function unifiedDiff(a: string[], b: string[], context = 3): string[] {
  const m = a.length;
  const n = b.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  type Op = { kind: " " | "-" | "+"; line: string; aLine: number; bLine: number };
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      ops.push({ kind: " ", line: a[i], aLine: i + 1, bLine: j + 1 });
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ kind: "-", line: a[i], aLine: i + 1, bLine: j + 1 });
      i += 1;
    } else {
      ops.push({ kind: "+", line: b[j], aLine: i + 1, bLine: j + 1 });
      j += 1;
    }
  }
  while (i < m) ops.push({ kind: "-", line: a[i], aLine: ++i, bLine: j + 1 });
  while (j < n) ops.push({ kind: "+", line: b[j], aLine: i + 1, bLine: ++j });

  const changed = ops
    .map((op, index) => ({ op, index }))
    .filter(({ op }) => op.kind !== " ")
    .map(({ index }) => index);

  if (changed.length === 0) return [];

  const keep = new Set<number>();
  for (const index of changed) {
    for (
      let k = Math.max(0, index - context);
      k <= Math.min(ops.length - 1, index + context);
      k += 1
    ) {
      keep.add(k);
    }
  }

  const output: string[] = [];
  let previous = -2;
  for (const index of [...keep].sort((x, y) => x - y)) {
    if (index !== previous + 1) {
      const first = ops[index];
      output.push(`@@ -${first.aLine} +${first.bLine} @@`);
    }
    output.push(`${ops[index].kind}${ops[index].line}`);
    previous = index;
  }
  return output;
}

function main(argv: string[]): number {
  const check = argv.includes("--check");
  const unknown = argv.filter((arg) => arg !== "--check" && arg !== "-h" && arg !== "--help");
  if (unknown.length > 0) {
    console.error(`✘ 未知参数：${unknown.join(" ")}`);
    console.error(USAGE);
    return 2;
  }
  if (argv.includes("-h") || argv.includes("--help")) {
    console.log(USAGE);
    return 0;
  }

  const { content, sectionCount, total } = render();

  if (check) {
    const current = existsSync(README_PATH) ? readFileSync(README_PATH, "utf8") : "";
    if (current === content) {
      console.log("✔ README.md 与数据一致");
      return 0;
    }
    console.log("✘ README.md 与 data/ 不一致，请运行 npm run build");
    const diff = unifiedDiff(current.split("\n"), content.split("\n"));
    console.log(diff.slice(0, 40).join("\n"));
    if (diff.length > 40) console.log(`... 其余 ${diff.length - 40} 行差异省略`);
    return 1;
  }

  if (existsSync(README_PATH) && readFileSync(README_PATH, "utf8") === content) {
    console.log("✔ README.md 无变化");
    return 0;
  }

  writeFileSync(README_PATH, content, "utf8");
  console.log(`✔ 已生成 README.md（${sectionCount} 个主题分节 / ${total} 条资源）`);
  return 0;
}

process.exit(main(process.argv.slice(2)));
