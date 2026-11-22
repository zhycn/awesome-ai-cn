#!/usr/bin/env node
/**
 * 巡检 data/*.json 中的链接是否仍然可用。
 *
 * 视角很重要：
 *   --region overseas（默认，CI 用）  能判断「活着 / 死了」，判断不了国内能否直连
 *   --region cn（本机用）             能判断「国内直连 / 被墙」，配合 access 字段落定三分类
 *
 * 判定规则：
 *   2xx/3xx            可达
 *   403/429            被反爬拒绝（告警，不算失效）
 *   其他 4xx/5xx       失效
 *   连接失败/超时        overseas → 失效；cn → 已标 proxy 视为正常，否则提示「可能需要标记 proxy」
 *
 * 用法:
 *   node scripts/check_links.ts                       # 海外视角（CI）
 *   node scripts/check_links.ts --region cn --write   # 国内视角，并把结果写入 config/link-status.json
 *
 * 退出码: 0 无失效链接；1 存在失效链接或数据问题；2 参数错误
 */

import { spawnSync, execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const DATA_DIR = join(ROOT, "data");
const STATUS_PATH = join(ROOT, "config", "link-status.json");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

const HIDDEN_STATUS = new Set(["deprecated", "archived"]);
const execFileAsync = promisify(execFile);

type Region = "cn" | "overseas";
type State = "ok" | "blocked" | "dead" | "proxy";

const LABELS: Record<State, string> = {
  ok: "可达",
  blocked: "被拒绝",
  dead: "失效",
  proxy: "需代理（符合标记）",
};

const USAGE = `用法: node scripts/check_links.ts [选项]

  --region cn|overseas   探测视角，默认 overseas
  --write                把结果写入 config/link-status.json（仅 cn 视角有意义）
  --timeout <秒>         curl 超时，默认 15
  --workers <并发>       默认 8
  --include-archived     连已归档条目一起检查
  -h, --help             显示本帮助`;

function hasCurl(): boolean {
  return spawnSync("curl", ["--version"], { stdio: "ignore" }).status === 0;
}

type Probe = { kind: "http"; code: number } | { kind: "network"; error: string };

async function probeCurl(url: string, timeout: number): Promise<Probe> {
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
    if (!/^\d{3}$/.test(code)) return { kind: "network", error: "curl 返回异常" };
    const value = Number(code);
    if (value === 0) return { kind: "network", error: "连接失败或超时" };
    return { kind: "http", code: value };
  } catch (error) {
    const failure = error as { code?: number | string; stdout?: string; stderr?: string };
    if (failure.code === 63) return { kind: "http", code: 200 }; // 超过 max-filesize，站点有响应
    const code = (failure.stdout ?? "").trim();
    if (/^\d{3}$/.test(code) && Number(code) !== 0) return { kind: "http", code: Number(code) };
    const stderr = (failure.stderr ?? "").trim().split("\n").pop() ?? "curl 失败";
    return { kind: "network", error: stderr.slice(0, 80) };
  }
}

async function probeFetch(url: string, timeout: number): Promise<Probe> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": UA, Accept: "*/*" },
      signal: AbortSignal.timeout(timeout * 1000),
    });
    return { kind: "http", code: response.status };
  } catch (error) {
    return { kind: "network", error: String((error as Error).name ?? error).slice(0, 80) };
  }
}

async function probe(url: string, timeout: number, useCurl: boolean): Promise<Probe> {
  let last: Probe = { kind: "network", error: "" };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500));
    last = useCurl ? await probeCurl(url, timeout) : await probeFetch(url, timeout);
    if (last.kind === "http") return last;
  }
  return last;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
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

type Target = { module: string; id: string; name: string; url: string; access: string };

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
      errors.push(
        message.includes("JSON") ? `${file}: JSON 语法错误` : `${file}: 读取失败（${message}）`,
      );
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
      if (
        !includeArchived &&
        typeof record.status === "string" &&
        HIDDEN_STATUS.has(record.status)
      ) {
        return;
      }
      const name = record.name;
      const url = record.url;
      if (typeof name !== "string" || typeof url !== "string" || !url) {
        errors.push(`${file}[${index}]: 缺少 name 或 url`);
        return;
      }
      const key = url.replace(/\/+$/, "");
      if (seen.has(key)) return;
      seen.add(key);
      targets.push({
        module: file.replace(/\.json$/, ""),
        id: String(record.id ?? ""),
        name,
        url,
        access: String(record.access ?? "direct"),
      });
    });
  }

  return { targets, errors };
}

function classify(result: Probe, target: Target, region: Region): State {
  if (result.kind === "http") {
    if (result.code >= 200 && result.code < 400) return "ok";
    if (result.code === 403 || result.code === 429) return "blocked";
    return "dead";
  }
  // 连接失败：国内视角下，已标 proxy 的视为符合预期
  if (region === "cn") return target.access === "proxy" ? "proxy" : "blocked";
  return "dead";
}

function writeStatus(results: { id: string; state: State }[], region: Region): void {
  const today = new Date().toISOString().slice(0, 10);
  const payload = {
    checkedAt: today,
    region,
    results: Object.fromEntries(
      results.filter((r) => r.id).map((r) => [r.id, { state: r.state, checkedAt: today }]),
    ),
  };
  writeFileSync(STATUS_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`✔ 状态已写入 config/link-status.json（${results.length} 条）`);
}

async function main(argv: string[]): Promise<number> {
  let timeout = 15;
  let workers = 8;
  let region: Region = "overseas";
  let includeArchived = false;
  let write = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--timeout" || arg === "--workers" || arg === "--region") {
      const value = argv[index + 1];
      if (!value) {
        console.error(`✘ ${arg} 缺少取值`);
        return 2;
      }
      if (arg === "--timeout") {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          console.error("✘ --timeout 需要正数");
          return 2;
        }
        timeout = parsed;
      } else if (arg === "--workers") {
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          console.error("✘ --workers 需要正数");
          return 2;
        }
        workers = Math.floor(parsed);
      } else {
        if (value !== "cn" && value !== "overseas") {
          console.error("✘ --region 只能是 cn 或 overseas");
          return 2;
        }
        region = value;
      }
      index += 1;
    } else if (arg === "--include-archived") {
      includeArchived = true;
    } else if (arg === "--write") {
      write = true;
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
  const results = await mapLimit(targets, workers, async (target) => {
    const probeResult = await probe(target.url, timeout, useCurl);
    return { target, state: classify(probeResult, target, region), raw: probeResult };
  });

  const counts: Partial<Record<State, number>> = {};
  for (const result of results) counts[result.state] = (counts[result.state] ?? 0) + 1;

  console.log(
    `共检查 ${targets.length} 条链接（探测方式：${useCurl ? "curl" : "fetch"}，视角：${region}）：`,
  );
  for (const state of ["ok", "proxy", "blocked", "dead"] as State[]) {
    if (counts[state]) console.log(`  ${LABELS[state]}: ${counts[state]}`);
  }

  const problems = results.filter((result) => result.state !== "ok" && result.state !== "proxy");
  if (problems.length > 0) {
    console.log("\n需要关注：");
    for (const problem of problems.sort((a, b) => a.state.localeCompare(b.state))) {
      const detail = problem.raw.kind === "http" ? problem.raw.code : problem.raw.error;
      console.log(
        `  [${problem.state}] ${problem.target.module} / ${problem.target.name} -> ${problem.target.url} (${detail})`,
      );
    }
  }

  if (write) {
    if (region !== "cn") {
      console.log("提示：--write 只在国内视角（--region cn）下有意义，已跳过写入");
    } else {
      writeStatus(
        results.map((r) => ({ id: r.target.id, state: r.state })),
        region,
      );
    }
  }

  return results.some((result) => result.state === "dead") ? 1 : 0;
}

main(process.argv.slice(2)).then((code) => process.exit(code));
