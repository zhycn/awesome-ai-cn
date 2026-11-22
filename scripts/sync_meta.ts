#!/usr/bin/env node
/**
 * 把 config/meta.json 的 about / topics 同步到 GitHub 仓库设置（About 与 Topics）。
 *
 * 需要 META_TOKEN：一个含「Administration 写权限」的 PAT（经典 token 勾 repo 即可）。
 * 未配置时直接跳过——派生仓库不需要为模板仓库的自动化配置这个 secret。
 */

import { readFileSync } from "node:fs";

const token = process.env.GH_TOKEN?.trim();
const repoSlug = process.env.GITHUB_REPOSITORY?.trim();

if (!token) {
  console.log("跳过：未配置 META_TOKEN（派生仓库可忽略此项）");
  process.exit(0);
}
if (!repoSlug) {
  console.log("跳过：不在 GitHub Actions 环境");
  process.exit(0);
}

const metaPath = new URL("../config/meta.json", import.meta.url);
const meta = JSON.parse(readFileSync(metaPath, "utf8")) as Record<string, unknown>;

const about = String(meta.about ?? meta.tagline ?? "").trim();
const topics = (Array.isArray(meta.topics) ? meta.topics : [])
  .map((topic) => normalizeTopic(String(topic)))
  .filter(Boolean)
  .slice(0, 20);

function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

async function call(path: string, method: "PATCH" | "PUT", body: unknown): Promise<boolean> {
  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = (await response.text()).slice(0, 200);
    console.log(`✘ ${method} ${path} -> ${response.status} ${text}`);
    return false;
  }
  return true;
}

let ok = true;
if (about)
  ok = (await call(`/repos/${repoSlug}`, "PATCH", { description: about.slice(0, 350) })) && ok;
if (topics.length) ok = (await call(`/repos/${repoSlug}/topics`, "PUT", { names: topics })) && ok;

console.log(
  ok
    ? "✔ 仓库 About / Topics 已同步"
    : "✘ 同步失败：检查 META_TOKEN 是否具备 Administration 写权限",
);
process.exit(ok ? 0 : 1);
