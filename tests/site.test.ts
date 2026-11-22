import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, "site");

test("生成静态站点：包含标题、搜索框与全部主题", () => {
  const result = spawnSync("npm", ["run", "build:site"], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);

  const html = readFileSync(join(OUT, "index.html"), "utf8");
  assert.match(html, /<h1>[^<]+<\/h1>/);
  assert.match(html, /id="q"/);
  assert.match(html, /<section id="/);
  assert.match(html, /data-text="/);

  // 每个条目都应有绝对链接
  const links = html.match(/href="https?:\/\//g) ?? [];
  assert.ok(links.length > 100, `链接数量异常：${links.length}`);

  rmSync(OUT, { recursive: true, force: true });
});
