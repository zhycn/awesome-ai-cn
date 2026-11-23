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
  vendor?: string;
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

function renderRow(item: Item, index: number, categoryTitle: string): string {
  const pick = item.featured ? '<span class="pick" title="精选" aria-label="精选">★</span>' : "";
  const proxy =
    item.access === "proxy" ? `<span class="flag" title="需要科学上网">proxy</span>` : "";
  const tags = (item.tags ?? [])
    .map(
      (tag) =>
        `<button class="tag" type="button" data-tag="${esc(tag)}" aria-pressed="false">${esc(tag)}</button>`,
    )
    .join("");
  const haystack = [item.name, item.desc, categoryTitle, item.vendor ?? "", ...(item.tags ?? [])]
    .join(" ")
    .toLowerCase();

  return `        <div class="row" data-text="${esc(haystack)}" data-tags="${esc((item.tags ?? []).join("|"))}">
          <span class="rank">${String(index + 1).padStart(3, "0")}</span>
          <span class="who">
            <a class="name" href="${esc(item.url)}" target="_blank" rel="noopener" title="${esc(item.name)}">${esc(item.name)}</a>
            <span class="vendor">${esc(item.vendor ?? "")}</span>
          </span>
          <span class="desc" title="${esc(item.desc)}">${esc(item.desc)}</span>
          <span class="tags">${pick}${proxy}${tags}</span>
        </div>`;
}

function main(): number {
  const meta = readJson<Record<string, string>>(join(ROOT, "config/meta.json"));
  const { categories } = readJson<{ categories: Category[] }>(join(ROOT, "config/categories.json"));

  const sections: string[] = [];
  const nav: string[] = [];
  const tagCount = new Map<string, number>();
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
    for (const item of items) {
      for (const tag of item.tags ?? []) tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    }

    const anchor = slug(cat.title) || cat.id;
    nav.push(
      `<a href="#${anchor}"><i>${String(nav.length + 1).padStart(2, "0")}</i><span>${esc(cat.title)}</span><b>${items.length}</b></a>`,
    );

    sections.push(`    <section id="${anchor}">
      <div class="sec-head">
        <div class="sec-title">
          <span class="sec-num">${String(sections.length + 1).padStart(2, "0")}</span>
          <h3>${esc(cat.title)}</h3>
          <span class="sec-line"></span>
          <span class="sec-count" aria-hidden="true">${items.length}</span>
        </div>
        ${cat.description ? `<p class="sec-desc">${esc(cat.description)}</p>` : ""}
      </div>
      <div class="rows">
${items.map((item, i) => renderRow(item, i, cat.title)).join("\n")}
      </div>
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
  const license = esc(meta.license ?? "MIT");

  // 链接核对时间来自 check_links 的产物，缺失时不显示
  let checkedAt = "";
  const statusPath = join(ROOT, "config/link-status.json");
  if (existsSync(statusPath)) {
    try {
      checkedAt = String(readJson<{ checkedAt?: string }>(statusPath).checkedAt ?? "");
    } catch {
      checkedAt = "";
    }
  }

  const topTags = [...tagCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag);

  const MARK_SVG =
    "<svg viewBox='0 0 32 32' aria-hidden='true'><g fill='currentColor'>" +
    "<rect x='6' y='8' width='9' height='9' rx='2'/>" +
    "<rect x='17' y='8' width='9' height='9' rx='2'/>" +
    "<rect x='6' y='19' width='9' height='9' rx='2'/>" +
    "<rect x='17' y='19' width='9' height='9' rx='2'/>" +
    "</g></svg>";

  const faviconSvg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
    "<rect width='32' height='32' rx='8' fill='%232563eb'/>" +
    "<g fill='white'>" +
    "<rect x='6' y='8' width='9' height='9' rx='2'/>" +
    "<rect x='17' y='8' width='9' height='9' rx='2'/>" +
    "<rect x='6' y='19' width='9' height='9' rx='2'/>" +
    "<rect x='17' y='19' width='9' height='9' rx='2'/>" +
    "</g></svg>";

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000">
<title>${esc(meta.name)}</title>
<meta name="description" content="${esc(summary)}">
<link rel="icon" href="data:image/svg+xml,${faviconSvg}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(meta.name)}">
<meta property="og:description" content="${esc(summary)}">
${homepage ? `<meta property="og:url" content="${esc(homepage)}">` : ""}
<meta name="twitter:card" content="summary">
<script>
  try {
    var saved = localStorage.getItem("theme");
    var pick = saved === "light" || saved === "auto" || saved === "dark" ? saved : "dark";
    var dark = pick === "dark" || (pick === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (error) {}
</script>
<style>${css}</style>
</head>
<body id="top">
<a class="skip" href="#main">跳到主要内容</a>

<header class="bar">
  <div class="bar-inner">
    <a class="brand" href="./" aria-label="${esc(meta.name)} 首页">
      ${MARK_SVG}
      <span>${esc(meta.name)}</span>
      <em>/ index</em>
    </a>
    <nav class="nav" aria-label="页面导航">
      <a href="#index">索引</a>
      <a href="#topics">主题</a>
      <a href="${repo}/tree/main/data">数据</a>
      <a href="${repo}" target="_blank" rel="noopener">GitHub ↗</a>
    </nav>
    <div class="search" role="search">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.8"/>
        <path d="M13.5 13.5 17 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <input id="q" type="search" placeholder="搜索名称、简介、标签或主题" autocomplete="off"
             aria-label="搜索名称、简介、标签或主题" aria-keyshortcuts="/">
      <kbd id="kbd" aria-hidden="true">/</kbd>
      <button id="clear" class="clear" type="button" hidden aria-label="清除搜索">×</button>
    </div>
    <button id="theme" class="theme-toggle" type="button" data-mode="dark" aria-label="切换主题">
      <svg class="theme-icon icon-sun" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3.1" stroke="currentColor" stroke-width="1.4"/>
        <path d="M8 1.2v1.8M8 13v1.8M1.2 8H3M13 8h1.8M3.2 3.2l1.3 1.3M11.5 11.5l1.3 1.3M12.8 3.2l-1.3 1.3M4.5 11.5l-1.3 1.3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      <svg class="theme-icon icon-moon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      </svg>
      <svg class="theme-icon icon-auto" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="5.6" stroke="currentColor" stroke-width="1.4"/>
        <path d="M8 2.4a5.6 5.6 0 0 1 0 11.2V2.4Z" fill="currentColor"/>
      </svg>
    </button>
  </div>
  <div class="progress" id="progress" aria-hidden="true"></div>
</header>

<h1 class="visually-hidden">${esc(meta.name)} — 中文 AI 资源索引</h1>

<div class="rail-wrap" id="topics">
  <div class="wrap rail-inner">
    <nav class="rail" id="rail" aria-label="主题导航">
${nav.join("\n")}
    </nav>
    <div class="rail-filter" id="rail-filter" hidden>
      <span id="results" class="results"></span>
      <div id="filters" class="filters"></div>
    </div>
  </div>
</div>

<div class="wrap">
  <div class="index-cap" id="index">
    <h2>Resource index</h2>
    <span id="index-count" data-total="${total}">${total} entries</span>
  </div>
  <div class="thead" aria-hidden="true">
    <span>#</span><span>资源</span><span>说明</span><span>标签</span>
  </div>

  <main id="main" tabindex="-1">
    <p id="empty" class="empty" hidden>
      <span>没有匹配的条目，换个关键词试试。</span>
      <span class="empty-tags">试试 ${topTags
        .map((t) => `<button class="tag" type="button" data-tag="${esc(t)}">${esc(t)}</button>`)
        .join(" ")}</span>
      <button id="reset" class="reset" type="button">清除搜索</button>
    </p>
    <p id="q-status" class="visually-hidden" role="status" aria-live="polite" aria-atomic="true"></p>
${sections.join("\n\n")}
  </main>

  <footer class="site-foot">
    <div class="foot-grid">
      <div class="foot-brand">
        <p class="wordmark" aria-hidden="true">Awesome<br><span class="outline">AI CN</span></p>
        <p class="eyebrow">The Chinese AI resource index</p>
      </div>
      <div class="foot-side">
        <p class="lede">按用途分类的 AI 资源索引，每条一句话说清它强在哪、适合谁。以中文可直接使用为优先，绕不开的国际主流也会保留。</p>
        <p class="foot-cta">
          <a href="${repo}" target="_blank" rel="noopener">在 GitHub 上加星 ↗</a>
          <a href="${repo}/issues/new?template=add-entry.yml">提交条目</a>
        </p>
        <p class="hero-stats">${total} entries · ${nav.length} topics · ${proxyCount} need proxy${
          checkedAt ? ` · checked ${esc(checkedAt)}` : ""
        }</p>
      </div>
    </div>
    <nav class="foot-nav" aria-label="主题索引">
${nav.join("\n")}
    </nav>
    <div class="foot-meta">
      <span>数据以 JSON 维护 · 本页由 <a href="${repo}/blob/main/scripts/site.ts">scripts/site.ts</a> 生成</span>
      <span class="footer-links">
        <a href="${repo}/blob/main/CONTRIBUTING.md">贡献指南</a>
        <a href="${repo}/issues/new?template=add-entry.yml">提交条目</a>
        <a href="${repo}/blob/main/LICENSE">${license}</a>
        <a href="#top">回到顶部 ↑</a>
      </span>
    </div>
  </footer>
</div>

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
const filters = document.getElementById("filters");
const kbd = document.getElementById("kbd");
const empty = document.getElementById("empty");
const status = document.getElementById("q-status");
const themeBtn = document.getElementById("theme");
const items = Array.from(document.querySelectorAll(".row"));
const sections = Array.from(document.querySelectorAll("main section"));
const links = Array.from(document.querySelectorAll(".rail a"));
const rail = document.getElementById("rail");
const railFilter = document.getElementById("rail-filter");
const progress = document.getElementById("progress");
const selected = new Set();

const itemTags = (el) => (el.dataset.tags || "").split("|").filter(Boolean);

function renderFilters() {
  filters.textContent = "";
  if (selected.size === 0) {
    filters.hidden = true;
    return;
  }
  filters.hidden = false;
  const label = document.createElement("span");
  label.className = "filters-label";
  label.textContent = "筛选";
  filters.append(label);
  for (const tag of selected) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.tag = tag;
    chip.setAttribute("aria-label", "移除筛选 " + tag);
    chip.textContent = tag;
    filters.append(chip);
  }
  const clearAll = document.createElement("button");
  clearAll.type = "button";
  clearAll.className = "chip-clear";
  clearAll.textContent = "清除";
  filters.append(clearAll);
}

function syncTagButtons() {
  for (const btn of document.querySelectorAll(".tag")) {
    btn.setAttribute("aria-pressed", selected.has(btn.dataset.tag) ? "true" : "false");
  }
}

function apply() {
  const q = input.value.trim().toLowerCase();
  const tags = [...selected];
  let visible = 0;

  for (const item of items) {
    const textOk = !q || item.dataset.text.includes(q);
    const tagsOk = tags.every((tag) => itemTags(item).includes(tag));
    const hit = textOk && tagsOk;
    item.hidden = !hit;
    if (hit) visible += 1;
  }

  let visibleSections = 0;
  for (const section of sections) {
    const count = section.querySelectorAll(".row:not([hidden])").length;
    section.hidden = count === 0;
    if (count > 0) visibleSections += 1;

    const badge = section.querySelector(".sec-count");
    if (badge) badge.textContent = String(count);

    const link = links.find((l) => l.getAttribute("href") === "#" + section.id);
    if (link) {
      const n = link.querySelector("b");
      if (n) n.textContent = String(count);
      link.hidden = count === 0;
    }
  }

  const active = q.length > 0 || tags.length > 0;
  empty.hidden = visible > 0;
  rail.hidden = active;
  railFilter.hidden = !active;
  if (active) {
    results.textContent =
      visible > 0 ? visible + " 条结果 · " + visibleSections + " 个主题" : "0 条结果";
    results.hidden = false;
  }
  clear.hidden = q.length === 0;
  kbd.hidden = q.length > 0;

  if (status) {
    status.textContent = !active
      ? ""
      : visible > 0
        ? "共 " + visible + " 条结果"
        : "没有匹配的条目";
  }

  const indexCount = document.getElementById("index-count");
  if (indexCount) {
    const totalEntries = indexCount.dataset.total;
    indexCount.textContent = active ? visible + " / " + totalEntries + " entries" : totalEntries + " entries";
  }

  renderFilters();
  syncTagButtons();
}

function clearAll() {
  input.value = "";
  selected.clear();
  apply();
  input.focus();
}

document.addEventListener("click", (event) => {
  const tagBtn = event.target.closest(".tag");
  if (tagBtn) {
    const tag = tagBtn.dataset.tag;
    if (selected.has(tag)) selected.delete(tag);
    else selected.add(tag);
    apply();
    return;
  }
  const chip = event.target.closest(".chip");
  if (chip) {
    selected.delete(chip.dataset.tag);
    apply();
    return;
  }
  if (event.target.closest(".chip-clear")) {
    selected.clear();
    apply();
  }
});

input.addEventListener("input", () => apply());
clear.addEventListener("click", clearAll);
reset.addEventListener("click", clearAll);
input.addEventListener("keydown", (event) => {
  if (event.key === "Escape") clearAll();
});
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

/* 主题：auto → light → dark 循环，localStorage 记忆 */
const media = matchMedia("(prefers-color-scheme: dark)");
let mode = localStorage.getItem("theme") || "dark";

function resolved(m) {
  return m === "auto" ? (media.matches ? "dark" : "light") : m;
}

function applyTheme() {
  const theme = resolved(mode);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const names = { auto: "跟随系统", light: "浅色", dark: "深色" };
  const next = { auto: "浅色", light: "深色", dark: "跟随系统" };
  themeBtn.title = "主题：" + names[mode] + "（点击切换为" + next[mode] + "）";
  themeBtn.setAttribute("aria-label", themeBtn.title);
  themeBtn.dataset.mode = mode;
}

themeBtn.addEventListener("click", () => {
  // auto 时先切到当前系统的反面，保证每次点击都有可见变化
  mode =
    mode === "auto"
      ? resolved("auto") === "dark"
        ? "light"
        : "dark"
      : mode === "dark"
        ? "light"
        : "auto";
  try {
    localStorage.setItem("theme", mode);
  } catch (error) {}
  applyTheme();
});

media.addEventListener("change", () => {
  if (mode === "auto") applyTheme();
});

applyTheme();

/* ---------- 顶栏：阅读进度与当前分区 ---------- */
let ticking = false;

function syncProgress() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const ratio = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
  if (progress) progress.style.transform = "scaleX(" + ratio + ")";
}

function syncActiveSection() {
  const line = Math.max(160, innerHeight * 0.33);
  let current = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= line) current = section;
  }
  for (const link of links) {
    const on = current !== null && link.getAttribute("href") === "#" + current.id;
    link.classList.toggle("on", on);
    if (on) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
  if (current && rail && !rail.hidden) {
    const active = links.find((l) => l.getAttribute("href") === "#" + current.id);
    if (active) {
      const box = rail.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      if (item.left < box.left || item.right > box.right) {
        rail.scrollLeft += item.left - box.left - 24;
      }
    }
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    syncProgress();
    syncActiveSection();
  });
}

function syncRailEdge() {
  if (rail) rail.dataset.left = rail.scrollLeft > 4 ? "1" : "0";
}
if (rail) rail.addEventListener("scroll", syncRailEdge, { passive: true });
syncRailEdge();

addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll, { passive: true });
syncProgress();
syncActiveSection();

/* 窄屏：缩短搜索提示语，避免被截断 */
function syncPlaceholder() {
  input.placeholder = innerWidth < 720 ? "搜索资源…" : "搜索名称、简介、标签或主题";
}
addEventListener("resize", syncPlaceholder, { passive: true });
syncPlaceholder();

`;

process.exit(main());
