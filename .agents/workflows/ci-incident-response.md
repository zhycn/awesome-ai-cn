---
name: ci-incident-response
trigger: 任一 GitHub Actions workflow 失败（ci / links / pages / sync-meta），或 link-check label 的 issue 出现
owner: 响应 Agent → 维护者
---

# 流程：CI 与平台事件响应

## 目的

CI 红、自动巡检失败、部署失败时，把「红了」变成「有结论的修复或误报记录」，不掩盖、不重复劳动。

## 触发

- CI / Link check / Deploy site / Sync repo metadata 任一 workflow 失败
- `link-check` label 的 open issue（`links.yml` 失败时自动创建）

## 输入

失败的 workflow 名称、run 链接、失败 step 日志。

## 角色

- **响应 Agent**：复现、定位、修复或判定误报
- **维护者**：密钥轮换、仓库设置、合并修复

## 步骤

### 1. 本地复现

```bash
git pull && npm ci && npm run check && npm test
```

本地绿 → 环境差异问题，走分支表「CI 红但本地绿」。

### 2. 按 workflow 分支处置

| workflow    | 常见原因                                                         | 处置                                                                                           |
| ----------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| CI          | PR 标题不合 Conventional Commits；贡献者忘跑 build；依赖漂移     | 标题问题请贡献者改；build:check 红 → 代跑 `npm run build` 提交                                 |
| Link check  | 见下「链接巡检失败分支」                                         | —                                                                                              |
| Deploy site | Pages 配置错（Source 未选 GitHub Actions）；`site/` 构建产物异常 | 配置问题提醒维护者改 Settings；构建问题本地 `npm run build:site` 排查                          |
| Sync meta   | `META_TOKEN` 过期/权限不足                                       | 提醒维护者轮换密钥（fine-grained PAT 需 Administration 读写）；未配 token 属静默跳过，不算故障 |

### 3. 链接巡检失败分支

| 失败率       | 判定            | 处置                                                                  |
| ------------ | --------------- | --------------------------------------------------------------------- |
| <50%         | 可能有真实死链  | 转入 `weekly-link-audit` 流程处置                                     |
| ≥50%         | 网络/巡检器故障 | 结果作废，重跑一次；连续两次失败在 issue 评论「已知误报」，等下个周期 |
| 单条稳定失败 | 真实死链        | 按死链处置口径：改 URL 或 `archived`                                  |

### 4. 记录

- 修复 → PR 引用失败的 run 链接
- 误报 → 在 `link-check` issue 评论判定依据；同一失败第 3 次出现时，写 ADR 记录规律并考虑改进巡检脚本（回母版）

## 输出

修复 PR，或 issue 上的误报判定评论。

## 异常

| 情况              | 处置                                                             |
| ----------------- | ---------------------------------------------------------------- |
| CI 红但本地全绿   | 对比 Node 版本（`.nvmrc`）、依赖（`npm ci` 全新装）、PR 合并基线 |
| flaky（重跑就绿） | 重跑一次可接受；同一步骤第 3 次 flaky 开 issue 记录，不无限重跑  |
| main 分支直接红   | 最高优先级：先定位是否上一次合并引入；修复走 expedited PR        |

## 红线

- 不用重跑掩盖 flaky——重跑前先看日志
- 同一失败第 3 次出现必须留痕（issue/ADR）
- Agent 不轮换密钥、不改仓库 Settings
