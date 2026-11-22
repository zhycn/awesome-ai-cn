#!/usr/bin/env node
/**
 * 校验 config/*.json 与 data/*.json 是否符合项目规范。
 *
 * 条目字段的约束来自 config/schema.json（改 schema 即生效）；
 * 跨条目的规则（id/URL/名称查重、featured 上限、主题文件名、日期语义）在本文件实现。
 *
 * 用法:
 *   node scripts/validate.ts
 *   node scripts/validate.ts --quiet
 *
 * 退出码: 0 通过；1 存在错误；2 参数错误
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CONFIG_DIR = join(ROOT, "config");
const DATA_DIR = join(ROOT, "data");

const OK = "✔";
const BAD = "✘";
const WARN = "▲";

const MAX_ITEMS_PER_MODULE = 120;
const MAX_FEATURED_PER_MODULE = 3;

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_RE = /^https?:\/\/[^\s]+$/;

const FAILED = Symbol("failed");
const TAGS_PATH = join(CONFIG_DIR, "tags.json");

type Report = { errors: string[]; warnings: string[] };

type Spec = {
  type?: string;
  enum?: unknown[];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  items?: Spec;
  required?: string[];
  properties?: Record<string, Spec>;
  additionalProperties?: boolean;
};

function rel(path: string): string {
  return relative(ROOT, path);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function typeName(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** 用单引号包裹，和文档里的报错示例保持一致 */
function quote(value: unknown): string {
  if (typeof value === "string") return `'${value}'`;
  return JSON.stringify(value) ?? String(value);
}

function locate(text: string, position: number): { line: number; column: number } {
  const before = text.slice(0, position).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

function loadJson(path: string, report: Report): unknown | typeof FAILED {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    report.errors.push(`${rel(path)}: 文件不存在`);
    return FAILED;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = (error as Error).message;
    const match = /position (\d+)/.exec(message);
    if (match) {
      const { line, column } = locate(text, Number(match[1]));
      report.errors.push(`${rel(path)}: JSON 语法错误：第 ${line} 行第 ${column} 列，${message}`);
    } else {
      report.errors.push(`${rel(path)}: JSON 语法错误：${message}`);
    }
    return FAILED;
  }
}

function checkValue(value: unknown, spec: Spec, where: string, report: Report): void {
  const expected = spec.type;

  if (expected === "string") {
    if (typeof value !== "string") {
      report.errors.push(`${where}: 应为字符串，实际是 ${typeName(value)}`);
      return;
    }
    if (spec.minLength !== undefined && value.length < spec.minLength) {
      report.errors.push(`${where}: 太短，至少 ${spec.minLength} 字（当前 ${value.length}）`);
    }
    if (spec.maxLength !== undefined && value.length > spec.maxLength) {
      report.errors.push(`${where}: 太长，最多 ${spec.maxLength} 字（当前 ${value.length}）`);
    }
    if (spec.pattern && !new RegExp(spec.pattern).test(value)) {
      report.errors.push(`${where}: 格式不符，应匹配 ${spec.pattern}：${quote(value)}`);
    }
  } else if (expected === "array") {
    if (!Array.isArray(value)) {
      report.errors.push(`${where}: 应为数组，实际是 ${typeName(value)}`);
      return;
    }
    if (spec.minItems !== undefined && value.length < spec.minItems) {
      report.errors.push(`${where}: 条目太少，至少 ${spec.minItems} 个（当前 ${value.length}）`);
    }
    if (spec.maxItems !== undefined && value.length > spec.maxItems) {
      report.errors.push(`${where}: 条目太多，最多 ${spec.maxItems} 个（当前 ${value.length}）`);
    }
    if (spec.uniqueItems) {
      const seen = new Set(value.map((entry) => JSON.stringify(entry)));
      if (seen.size !== value.length) report.errors.push(`${where}: 存在重复项`);
    }
    if (spec.items) {
      value.forEach((entry, index) => checkValue(entry, spec.items as Spec, `${where}[${index}]`, report));
    }
  } else if (expected === "object") {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      report.errors.push(`${where}: 应为对象，实际是 ${typeName(value)}`);
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of spec.required ?? []) {
      if (!(key in record)) report.errors.push(`${where}: 缺少必填字段 '${key}'`);
    }
    const properties = spec.properties ?? {};
    if (spec.additionalProperties === false) {
      for (const key of Object.keys(record)) {
        if (!(key in properties)) {
          report.errors.push(`${where}: 未知字段 '${key}'（拼写错误或规范未定义）`);
        }
      }
    }
    for (const [key, child] of Object.entries(properties)) {
      if (key in record) checkValue(record[key], child, `${where}.${key}`, report);
    }
  } else if (expected === "boolean") {
    if (typeof value !== "boolean") {
      report.errors.push(`${where}: 应为布尔值，实际是 ${typeName(value)}`);
    }
  }

  if (spec.enum && !spec.enum.includes(value as never)) {
    report.errors.push(`${where}: 取值非法 ${quote(value)}，只能是 ${JSON.stringify(spec.enum).replace(/"/g, "'")}`);
  }
}

function isRealDate(text: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function checkItemSemantics(item: Record<string, unknown>, where: string, report: Report): void {
  for (const key of ["name", "desc", "vendor"]) {
    const value = item[key];
    if (typeof value === "string" && /[\r\n]/.test(value)) {
      report.errors.push(`${where}.${key}: 不能包含换行（会破坏 README 渲染）`);
    }
  }

  const desc = item.desc;
  if (typeof desc === "string") {
    if (desc.endsWith("。")) report.warnings.push(`${where}.desc: 结尾不要加句号`);
    if (/[！!~]$/.test(desc)) report.warnings.push(`${where}.desc: 避免感叹号，保持陈述语气`);
  }

  const url = item.url;
  if (typeof url === "string" && URL_RE.test(url)) {
    try {
      if (!new URL(url).host) report.errors.push(`${where}.url: 缺少域名：${url}`);
    } catch {
      report.errors.push(`${where}.url: 无法解析：${url}`);
    }
  }

  const added = item.added;
  if (typeof added === "string" && DATE_RE.test(added)) {
    if (!isRealDate(added)) {
      report.errors.push(`${where}.added: 不是合法日期：${added}`);
    } else {
      const [year, month, day] = added.split("-").map(Number);
      const value = new Date(year, month - 1, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (value > today) report.warnings.push(`${where}.added: 收录日期 ${added} 在未来`);
    }
  }
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/+$/, "");
    return `${parsed.protocol.replace(":", "").toLowerCase()}://${parsed.host.toLowerCase()}${path}${parsed.search}`;
  } catch {
    return url;
  }
}

function main(argv: string[]): number {
  const quiet = argv.includes("--quiet");
  const unknown = argv.filter((arg) => arg !== "--quiet");
  if (unknown.length > 0) {
    console.error(`✘ 未知参数：${unknown.join(" ")}`);
    console.error("用法: node scripts/validate.ts [--quiet]");
    return 2;
  }

  const report: Report = { errors: [], warnings: [] };
  const lines: string[] = [];

  // 1. 配置
  const meta = loadJson(join(CONFIG_DIR, "meta.json"), report);
  const categoriesDoc = loadJson(join(CONFIG_DIR, "categories.json"), report);
  let schema = loadJson(join(CONFIG_DIR, "schema.json"), report);

  if (meta !== FAILED) {
    if (typeof meta !== "object" || meta === null) {
      report.errors.push(`${rel(join(CONFIG_DIR, "meta.json"))}: 顶层应为对象`);
    } else {
      for (const key of ["name", "tagline", "description", "repo"]) {
        if (!(meta as Record<string, unknown>)[key]) {
          report.errors.push(
            `${rel(join(CONFIG_DIR, "meta.json"))}: 缺少字段 '${key}'（build.ts 依赖它）`,
          );
        }
      }
    }
  }

  const tagsDoc = loadJson(TAGS_PATH, report);
  let vocabulary: string[] = [];
  if (tagsDoc !== FAILED) {
    const list = (tagsDoc as { tags?: unknown })?.tags;
    if (!Array.isArray(list) || list.length === 0 || !list.every((t) => typeof t === "string")) {
      report.errors.push(`${rel(TAGS_PATH)}: tags 必须是非空字符串数组`);
    } else if (new Set(list).size !== list.length) {
      report.errors.push(`${rel(TAGS_PATH)}: tags 存在重复项`);
    } else {
      vocabulary = list as string[];
    }
  }

  let itemSpec: Spec | null = null;
  if (schema === FAILED || typeof schema !== "object" || schema === null) {
    if (schema !== FAILED) report.errors.push(`${rel(join(CONFIG_DIR, "schema.json"))}: 顶层应为对象`);
  } else {
    itemSpec =
      ((schema as { $defs?: { item?: Spec } }).$defs?.item as Spec | undefined) ?? null;
    if (!itemSpec) {
      report.errors.push(`${rel(join(CONFIG_DIR, "schema.json"))}: 缺少 $defs.item 定义`);
    }
  }

  let categories: Record<string, unknown>[] = [];
  if (categoriesDoc !== FAILED && typeof categoriesDoc === "object" && categoriesDoc !== null) {
    const raw = (categoriesDoc as { categories?: unknown }).categories;
    if (!Array.isArray(raw) || raw.length === 0) {
      report.errors.push(`${rel(join(CONFIG_DIR, "categories.json"))}: categories 必须是非空数组（至少一个主题）`);
    } else {
      categories = raw as Record<string, unknown>[];
    }
  } else if (categoriesDoc !== FAILED) {
    report.errors.push(`${rel(join(CONFIG_DIR, "categories.json"))}: 顶层应为对象，且包含 categories 数组`);
  }

  const seenIds = new Set<string>();
  const seenFiles = new Set<string>();
  const categoriesPath = rel(join(CONFIG_DIR, "categories.json"));

  categories.forEach((cat, index) => {
    const where = `${categoriesPath} categories[${index}]`;
    if (typeof cat !== "object" || cat === null) {
      report.errors.push(`${where}: 应为对象`);
      return;
    }
    for (const key of ["id", "title", "file"]) {
      if (!cat[key]) report.errors.push(`${where}: 缺少 '${key}'`);
    }

    const rawId = cat.id;
    let cid: string;
    if (typeof rawId === "string") {
      cid = rawId;
    } else {
      if (rawId !== undefined) {
        report.errors.push(`${where}: id 应为字符串，实际是 ${typeName(rawId)}`);
      }
      cid = "";
    }
    if (cid && !ID_RE.test(cid)) report.errors.push(`${where}: id 需为小写连字符：'${cid}'`);
    if (seenIds.has(cid)) report.errors.push(`${where}: id 重复：'${cid}'`);
    seenIds.add(cid);

    const rawFile = cat.file;
    let filename: string;
    if (typeof rawFile === "string") {
      filename = rawFile;
    } else {
      if (rawFile !== undefined) {
        report.errors.push(`${where}: file 应为字符串，实际是 ${typeName(rawFile)}`);
      }
      filename = "";
    }
    if (filename && !filename.endsWith(".json")) {
      report.errors.push(`${where}: file 需以 .json 结尾：'${filename}'`);
    }
    if (filename && (filename.includes("/") || filename.includes("\\") || filename.startsWith("."))) {
      report.errors.push(`${where}: file 只能是 data/ 下的文件名，不能含路径：'${filename}'`);
    }
    if (cid && filename && filename !== `${cid}.json`) {
      report.errors.push(`${where}: file 应为 <id>.json：期望 ${cid}.json，实际 '${filename}'`);
    }
    if (seenFiles.has(filename)) report.errors.push(`${where}: file 重复：'${filename}'`);
    seenFiles.add(filename);
  });

  const registered = new Set(
    categories
      .filter((cat) => typeof cat === "object" && cat !== null)
      .map((cat) => String(cat.file ?? "")),
  );

  // 2. 数据
  const itemIds = new Map<string, string>();
  const itemUrls = new Map<string, string>();
  const itemNames = new Set<string>();
  let moduleCount = 0;
  let itemCount = 0;

  if (!existsSync(DATA_DIR)) {
    report.errors.push(`${rel(DATA_DIR)}: 目录不存在`);
  } else {
    const files = readdirSync(DATA_DIR)
      .filter((name) => name.endsWith(".json"))
      .sort();

    for (const name of files) {
      const path = join(DATA_DIR, name);
      const body = loadJson(path, report);
      if (body === FAILED) continue;
      if (body === null) {
        report.errors.push(`${rel(path)}: 顶层不能为 null，应为条目数组`);
        continue;
      }
      moduleCount += 1;
      if (!registered.has(name)) {
        report.errors.push(`${rel(path)}: 该文件未在 config/categories.json 中注册，请先添加主题`);
        continue;
      }
      if (!Array.isArray(body)) {
        report.errors.push(`${rel(path)}: 顶层应为数组（条目列表）`);
        continue;
      }

      let featured = 0;
      body.forEach((item, index) => {
        const where = `${rel(path)}[${index}]`;
        if (itemSpec) checkValue(item, itemSpec, where, report);
        if (typeof item !== "object" || item === null || Array.isArray(item)) return;
        itemCount += 1;
        const record = item as Record<string, unknown>;
        checkItemSemantics(record, where, report);
        if (record.featured) featured += 1;

        const iid = record.id;
        if (typeof iid === "string") {
          if (itemIds.has(iid)) {
            report.errors.push(`${where}.id: id 全局重复：'${iid}'（首次出现于 ${itemIds.get(iid)}）`);
          } else {
            itemIds.set(iid, where);
          }
        }

        const tags = record.tags;
        if (Array.isArray(tags)) {
          if (tags.length === 0) {
            report.errors.push(`${where}.tags: 为空时请直接省略该字段`);
          } else {
            tags.forEach((tag, tagIndex) => {
              if (typeof tag === "string" && vocabulary.length > 0 && !vocabulary.includes(tag)) {
                report.errors.push(
                  `${where}.tags[${tagIndex}]: 取值非法 '${tag}'，只能是 ${vocabulary.map((t) => `'${t}'`).join(", ")}（词表见 config/tags.json）`,
                );
              }
            });
          }
        }

        const itemName = record.name;
        if (typeof itemName === "string" && itemName) {
          const key = `${name}\u0000${itemName.toLowerCase()}`;
          if (itemNames.has(key)) {
            report.errors.push(`${where}.name: 同一主题内名称重复：'${itemName}'`);
          } else {
            itemNames.add(key);
          }
        }

        const url = record.url;
        if (typeof url === "string" && URL_RE.test(url)) {
          const norm = normalizeUrl(url);
          if (itemUrls.has(norm)) {
            report.errors.push(`${where}.url: 链接重复：${url}（已收录于 ${itemUrls.get(norm)}）`);
          } else {
            itemUrls.set(norm, where);
          }
        }
      });

      if (featured > MAX_FEATURED_PER_MODULE) {
        report.errors.push(`${rel(path)}: featured 条目 ${featured} 条，超过上限 ${MAX_FEATURED_PER_MODULE}`);
      }
      if (body.length > MAX_ITEMS_PER_MODULE) {
        report.warnings.push(`${rel(path)}: 条目 ${body.length} 条，建议拆分为子主题（阈值 ${MAX_ITEMS_PER_MODULE}）`);
      }
    }
  }

  // 3. 输出
  if (!quiet) {
    const mark = (path: string, label: string): string => {
      const bad = report.errors.some((entry) => entry.startsWith(rel(path)));
      return `  ${bad ? BAD : OK} ${label}`;
    };

    lines.push("配置");
    lines.push(mark(join(CONFIG_DIR, "meta.json"), "config/meta.json"));
    lines.push(mark(join(CONFIG_DIR, "categories.json"), `config/categories.json（${categories.length} 个主题）`));
    lines.push(mark(join(CONFIG_DIR, "schema.json"), "config/schema.json"));
    lines.push(mark(TAGS_PATH, "config/tags.json"));
    lines.push("");
    lines.push("数据");
    lines.push(`  ${OK} ${moduleCount} 个模块 / ${itemCount} 条条目`);

    const existing = new Set(readdirSync(DATA_DIR).filter((name) => name.endsWith(".json")));
    const missing = categories.filter((cat) => cat.file && !existing.has(String(cat.file)));
    if (missing.length > 0) lines.push(`  ${WARN} 尚未收录内容的主题：${missing.length} 个`);
    lines.push("");
  }

  for (const warning of report.warnings) lines.push(`${WARN} ${warning}`);
  for (const error of report.errors) lines.push(`${BAD} ${error}`);

  lines.push("");
  if (report.errors.length > 0) {
    lines.push(`${BAD} 未通过：${report.errors.length} 个错误，${report.warnings.length} 个建议`);
  } else {
    lines.push(`${OK} 通过：0 个错误，${report.warnings.length} 个建议`);
  }

  console.log(lines.join("\n"));
  return report.errors.length === 0 ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));
