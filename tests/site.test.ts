import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "site");

/** 复制一份干净的仓库到临时目录（派生仓库视角），避免动到工作区 */
function sandbox(): string {
  const dir = mkdtempSync(join("/tmp", "awesome-site-"));
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (src) => !src.includes(`${sep}node_modules`) && !src.includes(`${sep}.git`),
  });
  return dir;
}

/** data/ 下可见条目总数（active/beta 会计入站点） */
function countItems(dir: string): number {
  let total = 0;
  for (const file of readdirSync(join(dir, "data"))) {
    if (!file.endsWith(".json")) continue;
    const items = JSON.parse(readFileSync(join(dir, "data", file), "utf8")) as {
      status?: string;
    }[];
    total += items.filter((item) => item.status === "active" || item.status === "beta").length;
  }
  return total;
}

function buildSite(cwd: string) {
  return spawnSync("npm", ["run", "build:site"], { cwd, encoding: "utf8" });
}

test("生成静态站点：包含标题、搜索框、主题与条目链接", () => {
  const result = buildSite(ROOT);
  assert.equal(result.status, 0, result.stderr);

  const html = readFileSync(join(OUT, "index.html"), "utf8");
  assert.match(html, /<h1[^>]*>[\s\S]*?<\/h1>/);
  assert.match(html, /id="q"/);

  // 有内容才断言主题分节与条目行；空数据的空态渲染由下一个测试覆盖
  const expected = countItems(ROOT);
  if (expected > 0) {
    assert.match(html, /<section id="/);
    assert.match(html, /data-text="/);

    // 每个可见条目都应有绝对链接（阈值随数据量走，不硬编码条目数）
    const links = html.match(/href="https?:\/\//g) ?? [];
    assert.ok(
      links.length >= expected,
      `链接数 ${links.length} 少于可见条目数 ${expected}——有条目没渲染成链接`,
    );
  }

  rmSync(OUT, { recursive: true, force: true });
});

test("空数据派生仓库：站点可构建且测试不因数据少而失败", () => {
  const dir = sandbox();
  try {
    // 模拟刚 scaffold 完的派生仓库：清空全部条目
    for (const file of readdirSync(join(dir, "data"))) {
      if (file.endsWith(".json")) {
        rmSync(join(dir, "data", file));
      }
    }
    assert.equal(countItems(dir), 0);

    const install = spawnSync("npm", ["ci", "--silent"], { cwd: dir, encoding: "utf8" });
    assert.equal(install.status, 0, install.stderr);

    const result = buildSite(dir);
    assert.equal(result.status, 0, result.stderr);

    const html = readFileSync(join(dir, "site", "index.html"), "utf8");
    assert.match(html, /<h1[^>]*>[\s\S]*?<\/h1>/);
    // 空数据不要求链接数，只要求结构完整、不崩溃
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
