#!/usr/bin/env node
/**
 * 由 config/ 与 data/ 生成静态站点到 site/（GitHub Pages 用）。
 *
 * 用法:
 *   node scripts/site.ts
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "site");

type Item = {
  id: string;
  name: string;
  url: string;
  desc: string;
  tags?: string[];
  featured?: boolean;
  status?: string;
  access?: string;
};

type Category = {
  id: string;
  title: string;
  file: string;
  emoji?: string;
  description?: string;
};

const VISIBLE = new Set(["active", "beta"]);

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\- ]/gu, "")
    .replace(/ /g, "-");
}

function renderItem(item: Item): string {
  const badges = [
    item.featured ? `<span class="star" title="精选">★</span>` : "",
    item.access === "proxy" ? `<span class="proxy" title="需要科学上网">🌐</span>` : "",
  ]
    .filter(Boolean)
    .join("");

  const tags = (item.tags ?? []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join("");

  const haystack = [item.name, item.desc, ...(item.tags ?? [])].join(" ").toLowerCase();

  return `      <li class="item" data-text="${esc(haystack)}">
        <div class="item-head">
          <a class="name" href="${esc(item.url)}" target="_blank" rel="noopener">${esc(item.name)}</a>
          ${badges}
        </div>
        <p class="item-desc">${esc(item.desc)}</p>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
      </li>`;
}

function main(): number {
  const meta = readJson<Record<string, string>>(join(ROOT, "config/meta.json"));
  const { categories } = readJson<{ categories: Category[] }>(join(ROOT, "config/categories.json"));

  const sections: string[] = [];
  const nav: string[] = [];
  let total = 0;
  let proxyCount = 0;

  for (const cat of categories) {
    const path = join(ROOT, "data", cat.file);
    if (!existsSync(path)) continue;
    const items = (readJson<Item[]>(path) ?? []).filter((item) =>
      VISIBLE.has(item.status ?? "active"),
    );
    if (items.length === 0) continue;

    total += items.length;
    proxyCount += items.filter((item) => item.access === "proxy").length;

    const anchor = slug(cat.title) || cat.id;
    nav.push(
      `<a href="#${anchor}">${cat.emoji ? `${esc(cat.emoji)} ` : ""}${esc(cat.title)}<span class="n">${items.length}</span></a>`,
    );

    sections.push(`  <section id="${anchor}">
    <h2>${cat.emoji ? `${esc(cat.emoji)} ` : ""}${esc(cat.title)}<span class="n">${items.length}</span></h2>
    ${cat.description ? `<p class="section-desc">${esc(cat.description)}</p>` : ""}
    <ul class="items">
${items.map(renderItem).join("\n")}
    </ul>
  </section>`);
  }

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.name)}</title>
<meta name="description" content="${esc(meta.description ?? "")}">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="hero">
  <div class="wrap">
    <h1>${esc(meta.name)}</h1>
    <p class="tagline">${esc(meta.tagline ?? "")}</p>
    <p class="desc">${esc(meta.description ?? "")}</p>
    <p class="stats">${total} 条资源 · ${nav.length} 个主题${proxyCount > 0 ? ` · 🌐 ${proxyCount} 条需科学上网` : ""}</p>
    <label class="search">
      <span class="visually-hidden">搜索</span>
      <input id="q" type="search" placeholder="搜索名称、简介或标签…（按 / 聚焦）" autocomplete="off">
    </label>
    <p id="empty" class="empty" hidden>没有匹配的条目</p>
  </div>
</header>

<nav class="toc"><div class="wrap">
${nav.join("\n")}
</div></nav>

<main class="wrap">
${sections.join("\n\n")}
</main>

<footer class="wrap">
  <p>
    <a href="${esc(meta.repo ?? "#")}">GitHub 仓库</a> ·
    <a href="${esc(meta.repo ?? "#")}/blob/main/CONTRIBUTING.md">贡献指南</a> ·
    数据以 JSON 维护，本页由 <code>scripts/site.ts</code> 生成
  </p>
</footer>
<script src="app.js"></script>
</body>
</html>
`;

  const css = `:root {
  --bg: #ffffff; --fg: #1f2328; --muted: #59636e; --card: #f6f8fa;
  --border: #d1d9e0; --accent: #4f46e5; --star: #d4a72c;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #0d1117; --fg: #e6edf3; --muted: #9198a1; --card: #161b22;
          --border: #30363d; --accent: #818cf8; --star: #e3b341; }
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}
.wrap { max-width: 880px; margin: 0 auto; padding: 0 20px; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
.hero { padding: 56px 0 28px; text-align: center; }
.hero h1 { margin: 0 0 12px; font-size: 2.2rem; letter-spacing: -0.02em; }
.tagline { margin: 0 0 10px; font-style: italic; color: var(--muted); }
.desc { margin: 0 auto 14px; max-width: 640px; color: var(--muted); }
.stats { margin: 0 0 22px; font-size: 0.9rem; color: var(--muted); }
.search input {
  width: min(100%, 460px); padding: 10px 14px; font-size: 15px;
  border: 1px solid var(--border); border-radius: 999px;
  background: var(--card); color: var(--fg); outline: none;
}
.search input:focus { border-color: var(--accent); }
.empty { color: var(--muted); margin-top: 14px; }
.toc { position: sticky; top: 0; z-index: 2; background: var(--bg);
       border-bottom: 1px solid var(--border); }
.toc .wrap { display: flex; flex-wrap: wrap; gap: 8px; padding: 10px 20px; }
.toc a { font-size: 13px; padding: 4px 10px; border-radius: 999px;
         background: var(--card); border: 1px solid var(--border); color: var(--fg); }
.toc a:hover { border-color: var(--accent); text-decoration: none; }
.toc .n { margin-left: 6px; color: var(--muted); font-size: 12px; }
main { padding: 36px 0 8px; }
section { margin-bottom: 44px; scroll-margin-top: 64px; }
h2 { font-size: 1.2rem; margin: 0 0 6px; }
h2 .n { margin-left: 8px; font-size: 0.85rem; color: var(--muted); font-weight: 400; }
.section-desc { margin: 0 0 18px; color: var(--muted); font-style: italic; }
.items { list-style: none; margin: 0; padding: 0; }
.item { padding: 12px 0; border-bottom: 1px solid var(--border); }
.item:last-child { border-bottom: 0; }
.item-head { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.name { font-weight: 600; }
.star { color: var(--star); }
.proxy { font-size: 0.9em; }
.item-desc { margin: 2px 0 6px; color: var(--muted); }
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 12px; padding: 1px 8px; border-radius: 999px;
       background: var(--card); border: 1px solid var(--border); color: var(--muted); }
footer { padding: 28px 0 48px; border-top: 1px solid var(--border);
         color: var(--muted); font-size: 13px; text-align: center; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (max-width: 640px) {
  .hero { padding: 32px 0 18px; }
  .hero h1 { font-size: 1.7rem; }
  .desc { font-size: 0.95rem; }
  .toc .wrap {
    flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .toc .wrap::-webkit-scrollbar { display: none; }
  .toc a { white-space: nowrap; flex: 0 0 auto; }
  .item { padding: 10px 0; }
}
[hidden] { display: none !important; }
`;

  const js = `const input = document.getElementById("q");
const empty = document.getElementById("empty");
const items = Array.from(document.querySelectorAll(".item"));
const sections = Array.from(document.querySelectorAll("main section"));

function apply(query) {
  const q = query.trim().toLowerCase();
  let visible = 0;
  for (const item of items) {
    const hit = !q || item.dataset.text.includes(q);
    item.hidden = !hit;
    if (hit) visible += 1;
  }
  for (const section of sections) {
    section.hidden = !section.querySelector(".item:not([hidden])");
  }
  empty.hidden = visible > 0;
}

input.addEventListener("input", (event) => apply(event.target.value));
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== input) {
    event.preventDefault();
    input.focus();
  }
  if (event.key === "Escape") {
    input.value = "";
    apply("");
    input.blur();
  }
});
`;

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "index.html"), html, "utf8");
  writeFileSync(join(OUT, "style.css"), css, "utf8");
  writeFileSync(join(OUT, "app.js"), js, "utf8");

  console.log(`✔ 已生成 site/（${total} 条资源 / ${nav.length} 个主题）`);
  return 0;
}

process.exit(main());
