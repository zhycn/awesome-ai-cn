import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** 复制一份干净的仓库到临时目录，避免动到工作区 */
function sandbox(): string {
  const dir = mkdtempSync(join(tmpdir(), "awesome-scaffold-"));
  cpSync(ROOT, dir, {
    recursive: true,
    filter: (src) => !src.includes(`${sep}node_modules`) && !src.includes(`${sep}.git`),
  });
  return dir;
}

function scaffold(cwd: string, args: string[]) {
  return spawnSync(process.execPath, ["scripts/scaffold.ts", ...args], {
    cwd,
    encoding: "utf8",
  });
}

const BASE = [
  "--name",
  "Awesome Test CN",
  "--slug",
  "awesome-test-cn",
  "--repo",
  "https://github.com/u/awesome-test-cn",
  "--author",
  "u",
];

function withCategories(dir: string): string {
  const path = join(dir, "cats.json");
  writeFileSync(
    path,
    JSON.stringify([{ id: "01-a", title: "主题 A", emoji: "🅰️", description: "示例主题" }]),
    "utf8",
  );
  return path;
}

test("正常派生：品牌、许可证、链接、README 全部替换", () => {
  const dir = sandbox();
  try {
    const cats = withCategories(dir);
    const result = scaffold(dir, [...BASE, "--categories", cats, "--force"]);
    assert.equal(result.status, 0, result.stderr);

    const meta = JSON.parse(readFileSync(join(dir, "config/meta.json"), "utf8"));
    assert.equal(meta.name, "Awesome Test CN");
    assert.equal(meta.slug, "awesome-test-cn");
    assert.equal(meta.repo, "https://github.com/u/awesome-test-cn");

    const readme = readFileSync(join(dir, "README.md"), "utf8");
    assert.match(readme, /<h1 align="center">Awesome Test CN<\/h1>/);
    assert.match(readme, /awesome-test-cn\/actions\/workflows\/ci\.yml/);

    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    assert.equal(pkg.name, "awesome-test-cn");
    assert.equal(pkg.version, "0.1.0");

    assert.match(readFileSync(join(dir, "LICENSE"), "utf8"), /Copyright \(c\) \d{4} u/);
    assert.match(
      readFileSync(join(dir, "SECURITY.md"), "utf8"),
      /awesome-test-cn\/security\/advisories\/new/,
    );

    const contributing = readFileSync(join(dir, "CONTRIBUTING.md"), "utf8");
    assert.ok(!contributing.includes("awesome-ai-cn"), "CONTRIBUTING 不应残留旧仓库名");

    // --force 会清空内容，README 应回到空态提示
    assert.match(readme, /\*内容正在收录中。\*/);

    const schema = JSON.parse(readFileSync(join(dir, "config/schema.json"), "utf8"));
    assert.equal(schema.$id, "https://github.com/u/awesome-test-cn/config/schema.json");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("data/ 非空且未加 --force：拒绝执行且不改动 meta", () => {
  const dir = sandbox();
  try {
    // 母版仓库自带的条目可能为空（刚 scaffold 过），测试自带一条，保证 data/ 非空
    writeFileSync(join(dir, "data", "zz-test-guard.json"), '[{"id":"zz-test-guard"}]', "utf8");
    const before = readFileSync(join(dir, "config/meta.json"), "utf8");
    const result = scaffold(dir, BASE);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /--force/);
    assert.equal(readFileSync(join(dir, "config/meta.json"), "utf8"), before);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--keep-data 与 --categories 冲突：报错而不是静默删数据", () => {
  const dir = sandbox();
  try {
    // 自带一条不在新主题里的条目，制造真实冲突（母版 data/ 可能为空）
    writeFileSync(
      join(dir, "data", "01-foundation-models.json"),
      '[{"id":"existing-entry"}]',
      "utf8",
    );
    const cats = withCategories(dir);
    const result = scaffold(dir, [...BASE, "--categories", cats, "--keep-data"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /冲突/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("非 MIT 许可证：直接拒绝，避免 README 与 LICENSE 不一致", () => {
  const dir = sandbox();
  try {
    const result = scaffold(dir, [...BASE, "--license", "Apache-2.0", "--force"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /只支持 MIT/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("未知参数与缺参数：退出码 1 并给出提示", () => {
  const dir = sandbox();
  try {
    const unknown = scaffold(dir, [...BASE, "--licence", "MIT", "--force"]);
    assert.equal(unknown.status, 1);
    assert.match(unknown.stderr, /未知参数/);

    const missing = scaffold(dir, ["--name", "X"]);
    assert.equal(missing.status, 1);
    assert.match(missing.stderr, /缺少必填参数/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
