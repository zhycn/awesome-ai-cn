---
name: weekly-link-audit
trigger: 每周一 links.yml 巡检后，或 link-check label 的 issue 出现，或维护者发起
owner: 维护 Agent
---

# 流程：每周链接巡检

## 目的

维护全部条目链接的可达性档案：判定死链、维护 `access` 标记，并把结论落成 PR。

## 触发

- 每周一 09:00（北京时间）`links.yml` 自动跑海外视角；失败时自动开/更新 `link-check` label 的 issue
- 发现 `link-check` label 的 open issue（进入 `ci-incident-response` 判定后转入本流程）
- `broken-link` issue 分诊后转来
- 维护者说「跑一次链接巡检」

## 输入

- CI 的海外巡检报告（issue 或 Actions 日志）
- 本机处于国内网络（跑 cn 视角的前提）

## 角色

- **维护 Agent**：执行巡检、维护观察名单、起草 PR
- **维护者**：确认批量 `archived`、合并 PR

## 步骤

### 1. 国内视角巡检（本机）

```bash
npm run check:links -- --region cn --write
```

结果写入 `config/link-status.json`（机器维护，不手改）。

### 2. 汇总三类结果

| 情况                      | 处置                                             |
| ------------------------- | ------------------------------------------------ |
| 国内不可达、海外可达      | 条目补 `"access": "proxy"`（README 显示 🌐）     |
| 两地都不可达（首次）      | 记入观察名单（见下），**暂不改**——暂态失败很常见 |
| 两地都不可达（连续 2 周） | 按死链处置口径：改 URL 或 `archived`             |

**观察名单**：`.agents/references/adr/` 同级不存状态；连续性判断的载体是 `config/link-status.json` 的 `checkedAt` + git 历史——首周发现两地失败时，在本流程产出的 PR 描述中记录「观察名单」条目（id + 首次失败日期），次周巡检时用 `git log -- config/link-status.json` 与上次 PR 描述核对是否连续第二周。若仓库启用了带 `failStreak` 字段的巡检脚本（母版演进项），以脚本数据为准。

### 3. 落盘与校验

改动条目后：

```bash
npm run validate && npm run build
```

提交：`chore: 链接巡检——新增 N 条 proxy 标记，M 条转 archived`。批量 `archived`（>5 条）先开 PR 请维护者确认。

### 4. 汇报

向维护者输出一页摘要：巡检条数、新增 🌐、`archived`、待观察名单、`link-check` issue 处置建议（可关闭则评论后留给维护者关）。

## 输出

巡检 PR + 一页摘要；`link-check` issue 的处置评论。

## 异常

| 情况                         | 处置                                                                   |
| ---------------------------- | ---------------------------------------------------------------------- |
| `check:links` 本身失败/超时  | 重跑一次；连续两次失败按 `ci-incident-response` 报告，不下任何链接结论 |
| 失败率 >50%                  | 视为网络/巡检器故障，全部结果作废，不写盘                              |
| 条目在观察名单但本次恢复可达 | 从观察名单移除，记录误报规律（有价值的沉淀进 ADR）                     |

## 红线

- 单次失败不下死链结论；连续两周才算
- `archived` 不删除，机器消费方需要历史
- `config/link-status.json` 是机器产物，不手改
- Agent 不直接关闭 `link-check` issue
