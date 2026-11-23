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
const CSS_PATH = join(ROOT, ".cache", "site.css");

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
    item.featured ? `<span class="badge badge-star" title="精选" aria-label="精选">★</span>` : "",
    item.access === "proxy"
      ? `<span class="badge badge-proxy" title="需要科学上网" aria-label="需要科学上网">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/>
              <path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" stroke="currentColor" stroke-width="1.2"/>
            </svg>
          </span>`
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
        <div class="tags">${tags}</div>
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

  if (!existsSync(CSS_PATH)) {
    console.error("✘ 缺少 .cache/site.css，请先运行 npm run build:css（或 npm run build:site）");
    process.exit(1);
  }
  const css = readFileSync(CSS_PATH, "utf8");

  const summary = String(meta.description ?? "").slice(0, 120);
  const repo = esc(meta.repo ?? "#");
  const homepage = String(meta.homepage ?? "").trim();

  const faviconSvg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
    "<rect width='32' height='32' rx='8' fill='%234f46e5'/>" +
    "<g fill='white'>" +
    "<rect x='8' y='10' width='16' height='3' rx='1.5'/>" +
    "<rect x='8' y='15' width='12' height='3' rx='1.5'/>" +
    "<rect x='8' y='20' width='8' height='3' rx='1.5'/>" +
    "</g></svg>";

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
<link rel="icon" href="data:image/svg+xml,${faviconSvg}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(meta.name)}">
<meta property="og:description" content="${esc(summary)}">
${homepage ? `<meta property="og:url" content="${esc(homepage)}">` : ""}
<meta name="twitter:card" content="summary">
<style>${css}</style>
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
      if (window.innerWidth <= 860) {
        const current = links.find((link) => link.getAttribute("href") === target);
        if (current) current.scrollIntoView({ inline: "center", block: "nearest" });
      }
    }
  },
  { rootMargin: "-15% 0px -75% 0px" },
);
for (const section of sections) observer.observe(section);
`;

process.exit(main());
