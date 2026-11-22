#!/usr/bin/env node
/**
 * 巡检 data/*.json 中的链接是否仍然可用。
 *
 * 探测优先使用 curl（部分站点会拦截 Node/Python 客户端的 TLS 指纹，返回假的 404），
 * 没有 curl 时回退到 fetch。
 *
 * 默认跳过 deprecated / archived 条目：这些是已停更的历史数据，不该每周报警。
 *
 * 用法:
 *   node scripts/check_links.ts
 *   node scripts/check_links.ts --timeout 20 --workers 8 --include-archived
 *
 * 退出码: 0 无失效链接；1 存在失效/不可达链接，或数据文件本身有问题；2 参数错误
 */

import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = join(ROOT, "data");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const HIDDEN_STATUS = new Set(["deprecated", "archived"]);

const execFileAsync = promisify(execFile);

type State = "ok" | "blocked" | "broken" | "unreachable";

const LABELS: Record<State, string> = {
  ok: "可达",
  blocked: "被拒绝",
  broken: "失效",
  unreachable: "不可达",
};

const USAGE = `用法: node scripts/check_links.ts [--timeout 秒] [--workers 并发] [--include-archived]`;

function hasCurl(): boolean {
  const result = spawnSync("curl", ["--version"], { stdio: "ignore" });
  return result.status === 0;
}

function classify(code: number): State {
  if (code >= 200 && code < 400) return "ok";
  if (code === 403 || code === 429) return "blocked";
  if (code === 0) return "unreachable";
  return "broken";
}

async function probeCurl(url: string, timeout: number): Promise<[State, string]> {
  const args = [
    "-sS",
    "-o",
    process.platform === "win32" ? "NUL" : "/dev/null",
    "-L",
    "--max-time",
    String(timeout),
    "--connect-timeout",
    "10",
    "--max-redirs",
    "10",
    "--max-filesize",
    "5242880",
    "-A",
    UA,
    "-w",
    "%{http_code}",
    "--",
    url,
  ];

  try {
    const { stdout } = await execFileAsync("curl", args, {
      encoding: "utf8",
      timeout: (timeout + 5) * 1000,
      maxBuffer: 1024 * 1024,
    });
    const code = stdout.trim();
    if (!/^\d{3}$/.test(code)) return ["unreachable", "curl 返回异常"];
    return [classify(Number(code)), code];
  } catch (error) {
    const failure = error as { code?: number | string; stdout?: string; stderr?: string };
    if (failure.code === 63) return ["ok", "200+"]; // 超过 max-filesize，站点有响应
    const code = (failure.stdout ?? "").trim();
    if (/^\d{3}$/.test(code)) return [classify(Number(code)), code];
    const stderr = (failure.stderr ?? "").trim().split("\n").pop() ?? "curl 失败";
    return ["unreachable", stderr.slice(0, 80)];
  }
}

async function probeFetch(url: string, timeout: number): Promise<[State, string]> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(timeout * 1000),
    });
    return [classify(response.status), String(response.status)];
  } catch (error) {
    return ["unreachable", String((error as Error).name ?? error).slice(0, 80)];
  }
}

async function probe(url: string, timeout: number, useCurl: boolean): Promise<[State, string]> {
  let last: [State, string] = ["unreachable", ""];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
    last = useCurl ? await probeCurl(url, timeout) : await probeFetch(url, timeout);
    if (last[0] !== "unreachable") return last;
  }
  return last;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

type Target = { module: string; name: string; url: string };

function collectTargets(includeArchived: boolean): { targets: Target[]; errors: string[] } {
  const errors: string[] = [];
  const targets: Target[] = [];
  const seen = new Set<string>();

  if (!existsSync(DATA_DIR)) return { targets, errors: ["数据目录不存在：data/"] };

  const files = readdirSync(DATA_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort();
  if (files.length === 0) return { targets, errors: ["data/ 下没有任何 *.json 文件"] };

  for (const file of files) {
    let body: unknown;
    try {
      body = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
    } catch (error) {
      const message = (error as Error).message;
      errors.push(message.includes("JSON") ? `${file}: JSON 语法错误` : `${file}: 读取失败（${message}）`);
      continue;
    }

    if (!Array.isArray(body)) {
      errors.push(`${file}: 顶层应为条目数组`);
      continue;
    }

    body.forEach((item: unknown, index: number) => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        errors.push(`${file}[${index}]: 条目应为对象`);
        return;
      }
      const record = item as Record<string, unknown>;
      if (!includeArchived && typeof record.status === "string" && HIDDEN_STATUS.has(record.status)) {
        return;
      }
      const name = record.name;
      const url = record.url;
      if (typeof name !== "string" || typeof url !== "string" || !url) {
        errors.push(`${file}[${index}]: 缺少 name 或 url`);
        return;
      }
      const key = url.replace(/\/+$/, "");
      if (seen.has(key)) return; // 同一 URL 只探一次
      seen.add(key);
      targets.push({ module: file.replace(/\.json$/, ""), name, url });
    });
  }

  return { targets, errors };
}

async function main(argv: string[]): Promise<number> {
  let timeout = 15;
  let workers = 8;
  let includeArchived = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--timeout" || arg === "--workers") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        console.error(`✘ ${arg} 需要一个正数`);
        return 2;
      }
      if (arg === "--timeout") timeout = value;
      else workers = Math.floor(value);
      index += 1;
    } else if (arg === "--include-archived") {
      includeArchived = true;
    } else if (arg === "-h" || arg === "--help") {
      console.log(USAGE);
      return 0;
    } else {
      console.error(`✘ 未知参数：${arg}`);
      console.error(USAGE);
      return 2;
    }
  }

  const { targets, errors } = collectTargets(includeArchived);
  if (errors.length > 0) {
    console.log("数据检查未通过：");
    for (const error of errors) console.log(`  ✘ ${error}`);
    return 1;
  }
  if (targets.length === 0) {
    console.log("没有需要检查的链接");
    return 0;
  }

  const useCurl = hasCurl();
  const results = await mapLimit(targets, workers, async (target) => ({
    target,
    ...(await probe(target.url, timeout, useCurl)).reduce(
      (acc, value, index) => ({ ...acc, [index === 0 ? "state" : "detail"]: value }),
      {} as { state: State; detail: string },
    ),
  }));

  const counts: Partial<Record<State, number>> = {};
  for (const result of results) counts[result.state] = (counts[result.state] ?? 0) + 1;

  console.log(`共检查 ${targets.length} 条链接（探测方式：${useCurl ? "curl" : "fetch"}）：`);
  for (const state of ["ok", "blocked", "broken", "unreachable"] as State[]) {
    if (counts[state]) console.log(`  ${LABELS[state]}: ${counts[state]}`);
  }

  const problems = results.filter((result) => result.state !== "ok");
  if (problems.length > 0) {
    console.log("\n需要关注：");
    for (const problem of problems.sort((a, b) => a.state.localeCompare(b.state))) {
      console.log(
        `  [${problem.state}] ${problem.target.module} / ${problem.target.name} -> ${problem.target.url} (${problem.detail})`,
      );
    }
  }

  const failed = results.some(
    (result) => result.state === "broken" || result.state === "unreachable",
  );
  return failed ? 1 : 0;
}

main(process.argv.slice(2)).then((code) => process.exit(code));
