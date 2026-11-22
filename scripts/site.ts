#!/usr/bin/env node
/**
 * 由 config/ 与 data/ 生成静态站点到 site/（GitHub Pages 用）。
 *
 * 产物是单文件 index.html（CSS/JS 内联），避免额外请求与深色模式闪白。
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

function renderItem(item: Item, categoryTitle: string): string {
  const badges = [
    item.featured
      ? `<span class="badge badge-star"><span aria-hidden="true">★</span> 精选</span>`
      : "",
    item.access === "proxy"
      ? `<span class="badge badge-proxy"><span aria-hidden="true">🌐</span> 需代理</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const tags = (item.tags ?? []).map((tag) => `<span class="tag">${esc(tag)}</span>`).join("");
  const haystack = [item.name, item.desc, categoryTitle, ...(item.tags ?? [])]
    .join(" ")
    .toLowerCase();

  return `      <li class="item" data-text="${esc(haystack)}">
        <a class="ext" href="${esc(item.url)}" target="_blank" rel="noopener" aria-label="在新标签页打开 ${esc(item.name)}" tabindex="-1">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" aria-hidden="true">
            <path d="M5 11 11 5M6.5 5H11v4.5" stroke="currentColor" stroke-width="1.6"
                  stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
        <div class="item-head">
          <a class="name" href="${esc(item.url)}" target="_blank" rel="noopener" title="${esc(item.name)}">${esc(item.name)}</a>
          ${badges}
        </div>
        <p class="item-desc" title="${esc(item.desc)}">${esc(item.desc)}</p>
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
    const emoji = cat.emoji
      ? `<span class="emoji" aria-hidden="true">${esc(cat.emoji)}</span>`
      : "";
    nav.push(
      `<a href="#${anchor}"><span class="label">${emoji}${esc(cat.title)}</span><span class="n" aria-hidden="true">${items.length}</span><span class="visually-hidden">${items.length} 条资源</span></a>`,
    );

    sections.push(`  <section id="${anchor}">
    <div class="section-head">
      <h2>${emoji}${esc(cat.title)}</h2>
      <span class="count" aria-hidden="true">${items.length}</span>
    </div>
    ${cat.description ? `<p class="section-desc">${esc(cat.description)}</p>` : ""}
    <ul class="items" role="list">
${items.map((item) => renderItem(item, cat.title)).join("\n")}
    </ul>
  </section>`);
  }

  const summary = String(meta.description ?? "").slice(0, 120);
  const repo = esc(meta.repo ?? "#");

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f6f7fb">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0d0e11">
<title>${esc(meta.name)}</title>
<meta name="description" content="${esc(summary)}">
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">跳到主要内容</a>

<header class="hero">
  <div class="hero-inner">
    <h1>${esc(meta.name)}</h1>
    <p class="tagline">${esc(meta.tagline ?? "")}</p>
    <p class="desc">${esc(meta.description ?? "")}</p>
    <p class="stats">
      <span><strong>${total}</strong> 条资源</span>
      <span><strong>${nav.length}</strong> 个主题</span>
      ${proxyCount > 0 ? `<span><strong>${proxyCount}</strong> 条需科学上网</span>` : ""}
    </p>
    <div class="search">
      <svg class="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
        <path d="M13.5 13.5 17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <input id="q" type="search" placeholder="搜索名称、简介、标签或主题…" autocomplete="off"
             aria-label="搜索名称、简介、标签或主题" aria-keyshortcuts="/">
      <kbd id="kbd" aria-hidden="true">/</kbd>
      <button id="clear" class="clear" type="button" hidden aria-label="清除搜索">×</button>
    </div>
    <p id="results" class="results" hidden></p>
  </div>
</header>

<div class="layout">
  <aside class="sidebar">
    <p class="sidebar-title" id="toc-title">主题</p>
    <nav aria-labelledby="toc-title">
${nav.join("\n")}
    </nav>
  </aside>

  <main id="main" tabindex="-1">
    <p id="empty" class="empty" hidden>没有匹配的条目，换个关键词试试。<button id="reset" class="reset" type="button">清除搜索</button></p>
    <p id="q-status" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></p>
${sections.join("\n\n")}
  </main>
</div>

<footer>
  <p>数据以 JSON 维护，本页由 <a href="${repo}/blob/main/scripts/site.ts">scripts/site.ts</a> 生成</p>
  <p><a href="${repo}">GitHub 仓库</a> · <a href="${repo}/blob/main/CONTRIBUTING.md">贡献指南</a> · <a href="${repo}/blob/main/LICENSE">MIT</a></p>
</footer>

<script>${JS}</script>
</body>
</html>
`;

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "index.html"), html, "utf8");

  console.log(`✔ 已生成 site/（${total} 条资源 / ${nav.length} 个主题）`);
  return 0;
}

const CSS = `
:root {
  color-scheme: light dark;
  --bg: #f6f7fb; --surface: #ffffff; --surface-2: #f0f2f7;
  --fg: #111318; --fg-2: #46505f; --muted: #5c6573; --border: #e2e6ef;
  --input-border: #8a93a6; --placeholder: #6b7383;
  --accent: #5b5bd6; --accent-soft: #eef0ff; --accent-ring: #4f4fc4;
  --star-fg: #8a5a0c; --star-bg: #fbf3e4;
  --proxy-fg: #1d4ed8; --proxy-bg: #eaf0fd;
  --shadow: 0 1px 2px rgba(16,24,40,.04), 0 10px 28px rgba(16,24,40,.06);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d0e11; --surface: #191b20; --surface-2: #22242a;
    --fg: #e9ebef; --fg-2: #bcc4cf; --muted: #9aa4b2; --border: #2b2e35;
    --input-border: #3f4552; --placeholder: #8a93a1;
    --accent: #8f8ff2; --accent-soft: #232539; --accent-ring: #a5a5f5;
    --star-fg: #e2b45c; --star-bg: #2a2218;
    --proxy-fg: #7cb0ff; --proxy-bg: #16202e;
    --shadow: 0 1px 2px rgba(0,0,0,.5), 0 12px 32px rgba(0,0,0,.4);
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  * { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
body {
  margin: 0; background: var(--bg); color: var(--fg);
  font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
        "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
:where(a, input):focus-visible { outline: 2px solid var(--accent-ring); outline-offset: 2px; }
.skip {
  position: absolute; left: 12px; top: -60px; z-index: 20;
  padding: 10px 16px; border-radius: 10px;
  background: var(--surface); color: var(--fg);
  border: 1px solid var(--accent); box-shadow: var(--shadow);
  transition: top .15s;
}
.skip:focus { top: 12px; }
.hero {
  position: relative; padding: 44px 24px 28px; text-align: center;
  border-bottom: 1px solid var(--border);
  background: radial-gradient(900px 280px at 50% -140px, var(--accent-soft), transparent 72%);
}
.hero-inner { max-width: 720px; margin: 0 auto; }
h1 {
  margin: 0 0 10px; font-size: clamp(1.85rem, 4vw, 2.5rem); font-weight: 800;
  letter-spacing: -0.03em; line-height: 1.15;
}
.tagline {
  margin: 0 0 10px; font-size: 1.0625rem; font-weight: 500; color: var(--fg-2);
}
.desc { margin: 0 auto; max-width: 520px; font-size: .8125rem; line-height: 1.7; color: var(--muted); }
.stats {
  display: flex; justify-content: center; flex-wrap: wrap;
  margin: 18px 0 0; font-size: 12.5px; color: var(--muted);
}
.stats span + span::before { content: "·"; margin: 0 9px; opacity: .45; }
.stats strong { color: var(--fg); font-weight: 600; font-variant-numeric: tabular-nums; }
.search { position: relative; max-width: 560px; margin: 18px auto 0; }
.search-icon {
  position: absolute; left: 17px; top: 50%; transform: translateY(-50%);
  width: 17px; height: 17px; color: var(--accent); pointer-events: none;
}
.search input {
  width: 100%; height: 50px; padding: 0 52px 0 46px; color: var(--fg);
  font-family: inherit; font-size: 15px; -webkit-appearance: none; appearance: none;
  background: var(--surface); border: 1px solid var(--input-border); border-radius: 12px;
  box-shadow: 0 1px 2px rgba(16,24,40,.04), 0 10px 24px rgba(91,91,214,.08);
  outline: none; transition: border-color .15s;
}
.search input::placeholder { color: var(--placeholder); }
.search input::-webkit-search-cancel-button,
.search input::-webkit-search-decoration,
.search input::-webkit-search-results-button,
.search input::-webkit-search-results-decoration {
  -webkit-appearance: none; appearance: none; display: none;
}
.search input:focus-visible {
  border-color: var(--accent); outline: 2px solid var(--accent-ring); outline-offset: 2px;
}
.search .clear {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  width: 34px; height: 34px; border: 0; border-radius: 8px; cursor: pointer;
  background: transparent; color: var(--muted); font-size: 20px; line-height: 1;
}
.search .clear:hover { background: var(--surface-2); color: var(--fg); }
.results { margin: 10px 0 0; font-size: 12.5px; color: var(--muted); text-align: center; }
.results button { margin-left: 8px; }
.reset {
  margin-left: 8px; padding: 4px 12px; font: inherit; font-size: 12.5px; cursor: pointer;
  color: var(--accent); background: var(--surface); border: 1px solid var(--border);
  border-radius: 999px;
}
.reset:hover { border-color: var(--accent); }
.search kbd {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  font: 11px/1 ui-monospace, monospace; color: var(--muted);
  border: 1px solid var(--border); border-radius: 6px; padding: 3px 6px;
  background: var(--surface-2);
}
.layout {
  display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 44px;
  max-width: 1200px; margin: 0 auto; padding: 32px 24px 24px;
}
.sidebar {
  position: sticky; top: 24px; align-self: start;
  max-height: calc(100dvh - 48px); overflow-y: auto; overscroll-behavior: contain;
  scrollbar-width: thin;
}
.sidebar-title {
  margin: 0 0 10px; padding-left: 10px; font-size: 11.5px; font-weight: 700;
  letter-spacing: .08em; text-transform: uppercase; color: var(--muted);
}
.sidebar nav { display: flex; flex-direction: column; gap: 1px; }
.sidebar a {
  position: relative; display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 7px 10px 7px 13px; border-radius: 8px;
  font-size: 14px; color: var(--muted); line-height: 1.45;
  transition: background .15s, color .15s;
}
.sidebar a::before {
  content: ""; position: absolute; left: 2px; top: 50%; width: 3px; height: 0;
  border-radius: 2px; background: var(--accent); transform: translateY(-50%);
  transition: height .15s ease;
}
.sidebar a:hover { background: var(--surface-2); color: var(--fg); }
.sidebar a.active { background: var(--accent-soft); color: var(--fg); font-weight: 600; }
.sidebar a.active::before { height: 16px; }
.sidebar .n { font-size: 11.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.sidebar a.active .n { color: var(--accent); }
.emoji { display: inline-block; margin-right: 4px; font-size: .88em; opacity: .85; filter: grayscale(.4); }
main { min-width: 0; }
section { margin: 0 0 36px; scroll-margin-top: 24px; }
section + section { border-top: 1px solid var(--border); padding-top: 32px; }
.section-head { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
h2 { margin: 0; font-size: 1.5rem; font-weight: 700; line-height: 1.3; letter-spacing: 0; }
.count { font-size: 11.5px; color: var(--muted); font-variant-numeric: tabular-nums; }
.section-desc { margin: 0 0 16px; font-size: .875rem; line-height: 1.6; color: var(--muted); }
.items {
  list-style: none; margin: 0; padding: 0; display: grid; gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  align-items: stretch;
}
.item {
  position: relative;
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px;
  padding: 16px 18px 15px; box-shadow: 0 1px 2px rgba(16,24,40,.04);
  transition: border-color .15s, box-shadow .15s;
}
.item:hover { border-color: var(--accent); box-shadow: var(--shadow); }
.item:focus-within { border-color: var(--accent); box-shadow: var(--shadow); }
.item-head {
  display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; padding-right: 26px;
}
.name {
  flex: 1 1 auto; min-width: 0;
  font-size: 1.0625rem; font-weight: 600; line-height: 1.35;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.name:hover { color: var(--accent); }
.ext {
  position: absolute; top: 13px; right: 12px; display: inline-flex;
  color: var(--muted); opacity: .38; transition: opacity .15s, color .15s;
}
.ext:hover { color: var(--accent); opacity: 1; }
.item:hover .ext, .item:focus-within .ext { opacity: .8; }
.badge {
  flex: none;
  display: inline-flex; align-items: center; gap: 3px; height: 20px; padding: 0 7px;
  border-radius: 999px; font-size: 11.5px; font-weight: 600; line-height: 1; white-space: nowrap;
}
.badge-star { color: var(--star-fg); background: var(--star-bg); }
.badge-proxy { color: var(--proxy-fg); background: var(--proxy-bg); }
.item-desc {
  margin: 7px 0 10px; font-size: .875rem; line-height: 1.6; color: var(--fg-2);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; line-clamp: 2;
}
.name::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
.tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag {
  font-size: 11.5px; line-height: 1.5; padding: 2px 8px; border-radius: 999px;
  background: var(--surface-2); color: var(--muted);
}
.empty { color: var(--muted); text-align: center; padding: 48px 0; }
footer {
  border-top: 1px solid var(--border); padding: 32px 24px 56px;
  text-align: center; color: var(--muted); font-size: 13px;
}
footer p { margin: 4px 0; }
footer a { color: var(--accent); }
footer a:hover { text-decoration: underline; }
.visually-hidden {
  position: absolute; width: 1px; height: 1px; overflow: hidden;
  clip: rect(0 0 0 0); white-space: nowrap;
}
[hidden] { display: none !important; }
@media (max-height: 640px) and (min-width: 861px) {
  .sidebar a { padding: 5px 10px 5px 13px; font-size: 13px; }
  .sidebar-title { display: none; }
}
@media print {
  .search, .results, .stats, .sidebar, .skip, footer { display: none !important; }
  body { background: #fff; color: #000; }
  .hero { padding: 0 0 16px; border: 0; background: none; }
  .layout { display: block; max-width: none; padding: 0; }
  .items { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .item { break-inside: avoid; box-shadow: none; }
  .badge, .tag { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  a { color: #000; text-decoration: none; }
  @page { margin: 14mm; }
}
@media (max-width: 860px) {
  .hero { padding: 32px 18px 22px; }
  .layout { display: block; padding: 16px 18px 20px; }
  .sidebar {
    position: sticky; top: 0; z-index: 5; max-height: none;
    margin: 0 -18px 16px; padding: 8px 0 6px;
    background: var(--bg); border-bottom: 1px solid var(--border);
  }
  section { scroll-margin-top: 64px; }
  .sidebar-title { display: none; }
  .sidebar nav {
    flex-direction: row; gap: 8px; overflow-x: auto; padding: 0 18px 8px;
    scroll-snap-type: x proximity; scroll-padding-inline: 18px;
    overscroll-behavior-x: contain; scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 24px), transparent);
    -webkit-mask-image: linear-gradient(90deg, #000 0, #000 calc(100% - 24px), transparent);
  }
  .sidebar nav::-webkit-scrollbar { display: none; }
  .sidebar a {
    flex: 0 0 auto; min-height: 40px; padding: 8px 13px; font-size: 13px;
    line-height: 1.2; background: var(--surface); border: 1px solid var(--border);
    scroll-snap-align: start;
  }
  .sidebar a::before { display: none; }
  .sidebar a.active { border-color: var(--accent); }
  .search .clear {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  width: 34px; height: 34px; border: 0; border-radius: 8px; cursor: pointer;
  background: transparent; color: var(--muted); font-size: 20px; line-height: 1;
}
.search .clear:hover { background: var(--surface-2); color: var(--fg); }
.results { margin: 10px 0 0; font-size: 12.5px; color: var(--muted); text-align: center; }
.results button { margin-left: 8px; }
.reset {
  margin-left: 8px; padding: 4px 12px; font: inherit; font-size: 12.5px; cursor: pointer;
  color: var(--accent); background: var(--surface); border: 1px solid var(--border);
  border-radius: 999px;
}
.reset:hover { border-color: var(--accent); }
.search kbd { display: none; }
}
`;

const JS = `
const input = document.getElementById("q");
const clear = document.getElementById("clear");
const reset = document.getElementById("reset");
const results = document.getElementById("results");
const kbd = document.getElementById("kbd");
const empty = document.getElementById("empty");
const status = document.getElementById("q-status");
const items = Array.from(document.querySelectorAll(".item"));
const sections = Array.from(document.querySelectorAll("main section"));
const links = Array.from(document.querySelectorAll(".sidebar a"));

function linkFor(section) {
  return links.find((link) => link.getAttribute("href") === "#" + section.id);
}

function apply(raw) {
  const q = raw.trim().toLowerCase();
  let visible = 0;

  for (const item of items) {
    const hit = !q || item.dataset.text.includes(q);
    item.hidden = !hit;
    if (hit) visible += 1;
  }

  let visibleSections = 0;
  for (const section of sections) {
    const count = section.querySelectorAll(".item:not([hidden])").length;
    section.hidden = count === 0;
    if (count > 0) visibleSections += 1;

    const badge = section.querySelector(".count");
    if (badge) badge.textContent = String(count);

    const link = linkFor(section);
    if (link) {
      const n = link.querySelector(".n");
      if (n) n.textContent = String(count);
      const spoken = link.querySelector(".visually-hidden");
      if (spoken) spoken.textContent = count + " 条资源";
      link.hidden = count === 0;
    }
  }

  const hasQuery = q.length > 0;
  empty.hidden = visible > 0;
  results.hidden = !hasQuery;
  if (hasQuery) {
    results.textContent =
      visible > 0 ? "共 " + visible + " 条结果 · " + visibleSections + " 个主题" : "没有匹配的条目";
  }
  clear.hidden = !hasQuery;
  kbd.hidden = hasQuery;

  if (status) {
    status.textContent = !hasQuery
      ? ""
      : visible > 0
        ? "共 " + visible + " 条结果"
        : "没有匹配「" + input.value.trim() + "」的条目";
  }
}

function clearSearch() {
  input.value = "";
  apply("");
  input.focus();
}

input.addEventListener("input", (event) => apply(event.target.value));
clear.addEventListener("click", clearSearch);
reset.addEventListener("click", clearSearch);
document.addEventListener("keydown", (event) => {
  if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
  const active = document.activeElement;
  if (
    active === input ||
    (active && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName)))
  ) {
    return;
  }
  event.preventDefault();
  input.focus();
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Escape") clearSearch();
});

const initial = location.hash ? linkFor(document.querySelector(location.hash) || sections[0]) : null;
const first = initial || links[0];
if (first) {
  first.classList.add("active");
  first.setAttribute("aria-current", "location");
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const target = "#" + entry.target.id;
      for (const link of links) {
        const on = link.getAttribute("href") === target;
        link.classList.toggle("active", on);
        if (on) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    }
  },
  { rootMargin: "-15% 0px -75% 0px" },
);
for (const section of sections) observer.observe(section);
`;

process.exit(main());
