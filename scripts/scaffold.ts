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
 *     [--categories ./categories.json] [--topics rust,rust-lang] \
 *     [--keep-data] [--dry-run] [--force]
 *
 * --categories 接受两种格式：
 *   [{ "id": "01-xxx", "title": "标题", "emoji": "🧠", "description": "一句话" }]
 *   或 { "categories": [ ... ] }（与 config/categories.json 同构）
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
  --license     许可证标识，目前只支持 MIT（默认）
  --tagline     一句话定位（默认由名称推导）
  --description 描述（默认由名称推导）
  --topics      GitHub topics，逗号分隔，默认 "awesome-list"
  --categories  主题定义 JSON 文件路径；给定后重建 data/ 骨架
  --keep-data   保留现有条目（与 --categories 同时使用时，未匹配的文件会报错而不是删除）
  --dry-run     只打印将要做什么，不写任何文件
  --force       跳过非空 data/ 的确认
  -h, --help    显示本帮助`;

type Options = {
  name: string;
  slug: string;
  repo: string;
  author: string;
  license: string;
  tagline?: string;
  description?: string;
  topics: string[];
  categories?: string;
  keepData: boolean;
  dryRun: boolean;
  force: boolean;
};

type Category = { id: string; title: string; file: string; emoji?: string; description?: string };

function fail(message: string): never {
  console.error(`✘ ${message}`);
  process.exit(1);
}

const VALUE_ARGS = new Set([
  "name",
  "slug",
  "repo",
  "author",
  "license",
  "tagline",
  "description",
  "topics",
  "categories",
]);
const FLAG_ARGS = new Set(["keep-data", "dry-run", "force"]);

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      process.exit(0);
    }
    if (!arg.startsWith("--")) fail(`无法识别的参数：${arg}`);

    const [key, inline] = arg.slice(2).split("=", 2) as [string, string | undefined];
    if (FLAG_ARGS.has(key)) {
      flags.add(key);
      continue;
    }
    if (!VALUE_ARGS.has(key)) fail(`未知参数 --${key}`);

    const value = inline ?? argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`--${key} 缺少取值`);
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
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail(`--slug 只能是小写字母/数字/连字符：${slug}`);

  const repo = (values.get("repo") as string).replace(/\/+$/, "").replace(/\.git$/, "");
  if (!/^https?:\/\/[^\s]+$/.test(repo)) fail(`--repo 必须是 http(s) 地址：${repo}`);

  const license = values.get("license") ?? "MIT";
  if (license !== "MIT") {
    fail(
      `--license 目前只支持 MIT（LICENSE 正文未模板化）。如需 ${license}，请手动替换 LICENSE 后改 config/meta.json。`,
    );
  }

  return {
    name: values.get("name") as string,
    slug,
    repo,
    author: values.get("author") as string,
    license,
    tagline: values.get("tagline"),
    description: values.get("description"),
    topics: (values.get("topics") ?? "awesome-list")
      .split(",")
      .map((topic) => topic.trim())
      .filter(Boolean),
    categories: values.get("categories"),
    keepData: flags.has("keep-data"),
    dryRun: flags.has("dry-run"),
    force: flags.has("force"),
  };
}

function readJson<T>(path: string, label: string): T {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch (error) {
    fail(`${label} 读取失败：${(error as Error).message}`);
  }
}

function dataFiles(): string[] {
  return existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter((name) => name.endsWith(".json")) : [];
}

function countEntries(files: string[]): number {
  return files.reduce((total, file) => {
    const body = readJson<unknown>(join(DATA_DIR, file), `data/${file}`);
    return total + (Array.isArray(body) ? body.length : 0);
  }, 0);
}

function loadCategories(path: string): { categories: Category[]; extra: Record<string, unknown> } {
  const doc = readJson<unknown>(path, "--categories");
  const extra =
    doc && typeof doc === "object" && !Array.isArray(doc)
      ? Object.fromEntries(
          Object.entries(doc as Record<string, unknown>).filter(([key]) => key !== "categories"),
        )
      : {};
  const raw = Array.isArray(doc) ? doc : (doc as { categories?: unknown })?.categories;
  if (!Array.isArray(raw) || raw.length === 0) {
    fail(
      "--categories 必须是非空数组，或包含非空 categories 数组的对象（与 config/categories.json 同构）",
    );
  }

  const categories = raw.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      fail(`--categories[${index}] 应为对象`);
    }
    const cat = entry as Record<string, unknown>;
    const id = String(cat.id ?? "");
    const title = String(cat.title ?? "");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) fail(`--categories[${index}].id 非法：${id}`);
    if (!title) fail(`--categories[${index}].title 不能为空`);
    const emoji = cat.emoji;
    if (emoji !== undefined && typeof emoji !== "string") {
      fail(`--categories[${index}].emoji 应为字符串`);
    }
    const description = cat.description;
    if (description !== undefined && typeof description !== "string") {
      fail(`--categories[${index}].description 应为字符串`);
    }
    return { id, title, file: `${id}.json`, emoji, description } as Category;
  });

  return { categories, extra };
}

function main(argv: string[]): number {
  const options = parseArgs(argv);

  // ---- 先把所有输入读完、校验完，再决定写什么 ----
  const files = dataFiles();
  const entries = countEntries(files);
  if (entries > 0 && !options.keepData && !options.force && !options.dryRun) {
    fail(`data/ 中还有 ${entries} 条内容。确认要清空请加 --force，或加 --keep-data 保留。`);
  }

  const loaded = options.categories ? loadCategories(options.categories) : null;
  const orphans = loaded
    ? files.filter((file) => !loaded.categories.some((cat) => cat.file === file))
    : [];
  if (loaded && options.keepData && orphans.length > 0) {
    fail(
      `--keep-data 与 --categories 冲突：${orphans.join(", ")} 不在新主题里。` +
        "请先把这些条目的主题合并，或去掉 --keep-data 明确清空。",
    );
  }

  const topic = options.name
    .replace(/^Awesome\s+/i, "")
    .replace(/\s+CN$/i, "")
    .trim();
  const tagline = options.tagline ?? `面向中文用户的 ${topic} 资源精选索引`;
  const description =
    options.description ??
    `收集 ${topic} 相关的项目、工具、文档与学习资源；README 由 data/*.json 自动生成，人可读，机可用。`;

  const metaPath = join(CONFIG_DIR, "meta.json");
  const meta = readJson<Record<string, unknown>>(metaPath, "config/meta.json");
  const nextMeta = {
    ...meta,
    name: options.name,
    slug: options.slug,
    tagline,
    description,
    repo: options.repo,
    author: options.author,
    license: options.license,
    topics: options.topics,
  };

  const changes: string[] = [];
  changes.push(`写入 config/meta.json（${options.name} / ${options.slug}）`);
  if (loaded) changes.push(`重建 config/categories.json（${loaded.categories.length} 个主题）`);
  if (!options.keepData) changes.push(`清空 data/ 中的 ${files.length} 个文件`);
  if (loaded) changes.push(`按主题建立 data/ 空骨架（${loaded.categories.length} 个）`);
  changes.push("更新 package.json 与 package-lock.json 的包名");
  changes.push("同步 config/schema.json 的 $id 与标题");
  changes.push("替换 SECURITY.md 的上报链接、LICENSE 的版权署名、CONTRIBUTING.md 的仓库名");
  changes.push("运行 scripts/build.ts 重新生成 README");

  if (options.dryRun) {
    console.log("拟执行：");
    for (const change of changes) console.log(`  - ${change}`);
    return 0;
  }

  // ---- 落盘 ----
  writeFileSync(metaPath, `${JSON.stringify(nextMeta, null, 2)}\n`, "utf8");

  if (loaded) {
    const { categories, extra } = loaded;
    const categoriesPath = join(CONFIG_DIR, "categories.json");
    const doc = {
      ...extra,
      categories: categories.map(({ emoji, description, ...rest }) => ({
        ...rest,
        ...(emoji ? { emoji } : {}),
        ...(description ? { description } : {}),
      })),
    };
    writeFileSync(categoriesPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");

    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    for (const cat of categories) {
      const path = join(DATA_DIR, cat.file);
      if (!existsSync(path) || !options.keepData) writeFileSync(path, "[]\n", "utf8");
    }
    if (!options.keepData) {
      for (const file of orphans) rmSync(join(DATA_DIR, file));
    }
  } else if (!options.keepData) {
    for (const file of files) rmSync(join(DATA_DIR, file));
  }

  const pkgPath = join(ROOT, "package.json");
  const pkg = readJson<Record<string, unknown>>(pkgPath, "package.json");
  pkg.name = options.slug;
  pkg.description = tagline;
  pkg.version = "0.1.0";
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");

  const lockPath = join(ROOT, "package-lock.json");
  if (existsSync(lockPath)) {
    const lock = readJson<Record<string, unknown>>(lockPath, "package-lock.json");
    lock.name = options.slug;
    const packages = lock.packages as Record<string, { name?: string }> | undefined;
    if (packages?.[""]) packages[""].name = options.slug;
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  }

  const schemaPath = join(CONFIG_DIR, "schema.json");
  if (existsSync(schemaPath)) {
    const schema = readJson<Record<string, unknown>>(schemaPath, "config/schema.json");
    schema.$id = `${options.repo}/config/schema.json`;
    schema.title = `${options.name} — 条目规范`;
    writeFileSync(schemaPath, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
  }

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
    const text = readFileSync(licensePath, "utf8").replace(
      /Copyright \(c\) \d{4} .*/,
      `Copyright (c) ${new Date().getFullYear()} ${options.author}`,
    );
    writeFileSync(licensePath, text, "utf8");
  }

  const contributingPath = join(ROOT, "CONTRIBUTING.md");
  if (existsSync(contributingPath) && meta.slug) {
    const text = readFileSync(contributingPath, "utf8").split(String(meta.slug)).join(options.slug);
    writeFileSync(contributingPath, text, "utf8");
  }

  execFileSync(process.execPath, [join(ROOT, "scripts", "build.ts")], { stdio: "inherit" });

  console.log(`
✔ 初始化完成：${options.name}

下一步：
  1. 编辑 config/categories.json、config/tags.json 与 data/*.json 录入内容
  2. npm run validate && npm run build && npm run check
  3. git remote set-url origin ${options.repo}.git
  4. git add -A && git commit -m "chore: 初始化 ${options.slug}"
  5. git push -u origin main
  6. 在 GitHub 上：设为 Template Repository、填写 description 与 topics、开启 main 分支保护
`);
  return 0;
}

process.exit(main(process.argv.slice(2)));
