# AGENTS.md

给 AI Agent 的入口文件。任何 agent 工具（Claude Code / Codex / Cursor / DSH 等）在本仓库工作时，先读本文件。

## 项目一句话定位

awesome-list 母版：`data/*.json` 是唯一事实源，`README.md` 与 `site/` 是脚本产物；`scripts/` 不含项目名，可 scaffold 派生成任意领域的清单。完整机制见 [`.agents/references/project-map.md`](.agents/references/project-map.md)。

## 必读

接任务前先读 [`.agents/README.md`](.agents/README.md)——里面有技能索引、指令清单、全部流程及其触发条件。

## 决策权限矩阵

| 类别 | Agent 可自主                                   | 须先问用户                                                                                                                                                                                     | 禁止                                                   |
| ---- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 内容 | 改 `data/*.json`、改条目 `url`/`desc`/`access` | 删除条目（一律用 `archived` 替代）、主题归属不明的新条目                                                                                                                                       | 直接编辑 `README.md`、`site/`、`.cache/`（均为产物）   |
| 结构 | —                                              | 改 `config/categories.json`、`config/tags.json`、`config/schema.json`、任何 `scripts/*.ts`（须走 [`.agents/workflows/change-management.md`](.agents/workflows/change-management.md) 并写 ADR） | 改现有条目/主题的 `id`；手改 `config/link-status.json` |
| Git  | 在分支上提交、开 PR                            | —                                                                                                                                                                                              | 直接 push `main`；合并 PR；force push                  |
| 平台 | 在 issue/PR 下评论（署名"由 Agent 处理"）      | —                                                                                                                                                                                              | 关闭 issue；关闭/锁定讨论                              |
| 外部 | 读取网页核对条目信息                           | 发表任何对外内容                                                                                                                                                                               | 提交含密钥/凭证的内容                                  |

## 不可变铁律

1. **改数据不改产物**：只改 `data/`、`config/`，然后 `npm run build`；`build:check` 红了说明你跳过了这步。
2. **校验器是唯一裁判**：字段判断以 `npm run validate` 输出和 `config/schema.json` 为准，不凭记忆放行。
3. **`id` 创建后永不修改**，`archived` 条目永不删除。
4. **一个 PR 一件事**。
5. 改动完成后跑 `npm run check`，红了不交付。
