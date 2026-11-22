#!/usr/bin/env node
/**
 * 把当前仓库初始化为一个新的 awesome list。
 *
 * 这是模板的核心：复制仓库后跑一次，替换品牌、清空内容、重建 README。
 *
 * 用法:
 *   npm run scaffold -- --name "Awesome Rust CN" --slug awesome-rust-cn \
 *     --repo https://github.com/you/awesome-rust-cn --author you \
 *     [--license MIT] [--tagline "..."] [--description "..."] \
 *     [--categories ./categories.json] [--keep-data] [--dry-run] [--force]
 *
 * --categories 接受 JSON 数组：[{ "id": "01-xxx", "title": "标题", "emoji": "🧠", "description": "一句话" }]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG_DIR = join(ROOT, "config");
const DATA_DIR = join(ROOT, "data");

const USAGE = `用法: npm run scaffold -- --name <名称> --slug <slug> --repo <URL> --author <署名> [选项]

必填:
  --name        清单名称，如 "Awesome Rust CN"
  --slug        仓库/包名，小写连字符，如 awesome-rust-cn
  --repo        仓库地址，如 https://github.com/you/awesome-rust-cn
  --author      版权署名

可选:
  --license     许可证标识，默认 MIT
  --topics      GitHub topics，逗号分隔，默认 "awesome-list"
  --tagline     一句话定位（默认自动生成）
  --description 描述（默认自动生成）
  --categories  主题定义 JSON 文件路径；给定后会重建 data/ 骨架
  --keep-data   保留现有条目不删除
  --dry-run     只打印将要做什么，不写文件
  --force       跳过非空 data/ 的确认`;

type Options = {
  name: string;
  slug: string;
  repo: string;
  author: string;
  license: string;
  tagline?: string;
  description?: string;
  categories?: string;
  topics: string[];
  keepData: boolean;
  dryRun: boolean;
  force: boolean;
};

function fail(message: string): never {
  console.error(`✘ ${message}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) fail(`无法识别的参数：${arg}`);
    const [key, inline] = arg.slice(2).split("=", 2) as [string, string | undefined];
    if (["keep-data", "dry-run", "force"].includes(key)) {
      flags.add(key);
      continue;
    }
    const value = inline ?? argv[index + 1];
    if (!value || value.startsWith("--")) fail(`--${key} 缺少取值`);
    values.set(key, value);
    if (inline === undefined) index += 1;
  }

  for (const required of ["name", "slug", "repo", "author"]) {
    if (!values.get(required)) {
      console.error(USAGE);
      fail(`缺少必填参数 --${required}`);
    }
  }

  const slug = values.get("slug") as string;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail(`--slug 只能是小写字母/数字/连字符：${slug}`);
  }
  const repo = (values.get("repo") as string).replace(/\/+$/, "");
  if (!/^https?:\/\/[^\s]+$/.test(repo)) fail(`--repo 必须是 http(s) 地址：${repo}`);

  return {
    name: values.get("name") as string,
    slug,
    repo,
    author: values.get("author") as string,
    license: values.get("license") ?? "MIT",
    tagline: values.get("tagline"),
    description: values.get("description"),
    categories: values.get("categories"),
    topics: (values.get("topics") ?? "awesome-list")
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean),
    keepData: flags.has("keep-data"),
    dryRun: flags.has("dry-run"),
    force: flags.has("force"),
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function dataFiles(): string[] {
  return existsSync(DATA_DIR)
    ? readdirSync(DATA_DIR).filter((name) => name.endsWith(".json"))
    : [];
}

function countEntries(files: string[]): number {
  return files.reduce((total, file) => {
    const body = readJson<unknown>(join(DATA_DIR, file));
    return total + (Array.isArray(body) ? body.length : 0);
  }, 0);
}

type Category = { id: string; title: string; file: string; emoji?: string; description?: string };

function loadCategories(path: string): Category[] {
  const raw = readJson<unknown>(path);
  if (!Array.isArray(raw) || raw.length === 0) fail("--categories 文件必须是非空数组");
  return raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) fail(`--categories[${index}] 应为对象`);
    const cat = entry as Record<string, unknown>;
    const id = String(cat.id ?? "");
    const title = String(cat.title ?? "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`--categories[${index}].id 非法：${id}`);
    if (!title) fail(`--categories[${index}].title 不能为空`);
    return { ...cat, id, title, file: `${id}.json` } as Category;
  });
}

function main(argv: string[]): number {
  const options = parseArgs(argv);
  const metaPath = join(CONFIG_DIR, "meta.json");
  const meta = readJson<Record<string, unknown>>(metaPath);

  const files = dataFiles();
  const entries = countEntries(files);
  const actions: string[] = [];

  if (entries > 0 && !options.keepData && !options.force && !options.dryRun) {
    fail(`data/ 中还有 ${entries} 条内容。确认要清空请加 --force，或加 --keep-data 保留。`);
  }

  // "Awesome Rust CN" -> "Rust"，用于生成默认文案
  const topic = options.name.replace(/^Awesome\s+/i, "").replace(/\s+CN$/i, "").trim();
  const tagline = options.tagline ?? `面向中文用户的 ${topic} 资源精选索引`;
  const description =
    options.description ??
    `收集 ${topic} 相关的项目、工具、文档与学习资源；README 由 data/*.json 自动生成，人可读，机可用。`;

  const nextMeta = {
    ...meta,
    name: options.name,
    slug: options.slug,
    tagline,
    description,
    repo: options.repo,
    author: options.author,
    license: options.license,
    version: "0.1.0",
    topics: options.topics,
  };

  actions.push(`写入 config/meta.json：${options.name}（${options.slug}）`);
  if (entries > 0 && !options.keepData && !options.force) {
    actions.push(`将清空 ${entries} 条现有内容（正式执行需加 --force）`);
  }
  if (!options.keepData) {
    actions.push(
      options.categories
        ? `清空 data/ 并按新主题建立 ${options.categories} 的空骨架`
        : `清空 data/ 中 ${files.length} 个文件`,
    );
  }
  actions.push(`更新 package.json 的 name/description`);
  actions.push(`更新 SECURITY.md 的漏洞上报链接`);
  actions.push(`更新 LICENSE 的版权署名`);

  if (options.dryRun) {
    console.log("拟执行：");
    for (const action of actions) console.log(`  - ${action}`);
    return 0;
  }

  writeFileSync(metaPath, `${JSON.stringify(nextMeta, null, 2)}\n`, "utf8");

  if (options.categories) {
    const categories = loadCategories(options.categories);
    writeFileSync(
      join(CONFIG_DIR, "categories.json"),
      `${JSON.stringify({ categories }, null, 2)}\n`,
      "utf8",
    );
    for (const cat of categories) {
      const path = join(DATA_DIR, cat.file);
      if (!existsSync(path) || !options.keepData) writeFileSync(path, "[]\n", "utf8");
    }
    const keep = new Set(categories.map((cat) => cat.file));
    for (const file of files) {
      if (!keep.has(file)) rmSync(join(DATA_DIR, file));
    }
  } else if (!options.keepData) {
    for (const file of files) rmSync(join(DATA_DIR, file));
  }

  const pkgPath = join(ROOT, "package.json");
  const pkg = readJson<Record<string, unknown>>(pkgPath);
  pkg.name = options.slug;
  pkg.description = tagline;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  const securityPath = join(ROOT, "SECURITY.md");
  if (existsSync(securityPath)) {
    const text = readFileSync(securityPath, "utf8").replace(
      /https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/security\/advisories\/new/g,
      `${options.repo}/security/advisories/new`,
    );
    writeFileSync(securityPath, text, "utf8");
  }

  const licensePath = join(ROOT, "LICENSE");
  if (existsSync(licensePath)) {
    const year = new Date().getFullYear();
    const text = readFileSync(licensePath, "utf8").replace(
      /Copyright \(c\) \d{4} .*/,
      `Copyright (c) ${year} ${options.author}`,
    );
    writeFileSync(licensePath, text, "utf8");
  }

  execFileSync(process.execPath, [join(ROOT, "scripts", "build.ts")], { stdio: "inherit" });

  console.log(`
✔ 初始化完成：${options.name}

下一步：
  1. 编辑 config/categories.json 与 data/*.json 录入内容
  2. npm run validate && npm run build
  3. git remote set-url origin ${options.repo}.git
  4. git add -A && git commit -m "chore: 初始化 ${options.slug}"
  5. git push -u origin main
  6. 在 GitHub 上：设为 Template Repository、填写 description 与 topics、开启 main 分支保护
`);
  return 0;
}

process.exit(main(process.argv.slice(2)));
