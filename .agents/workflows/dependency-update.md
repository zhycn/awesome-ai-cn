---
name: dependency-update
trigger: dependabot 打开依赖更新 PR（每月一批）
owner: 响应 Agent → 维护者
---

# 流程：依赖更新处置

## 目的

`.github/dependabot.yml` 每月开最多 3 个依赖 PR（`chore` 前缀）；本流程定义它们的合并口径，防止 CI 队列堆积。

## 触发

dependabot PR 打开（标题形如 `chore(deps): ...`）。

## 输入

dependabot PR：变更的依赖清单（patch / minor / major）。

## 角色

- **响应 Agent**：跑检查、评论结论
- **维护者**：合并

## 步骤

1. 看 PR 变更的版本级别
2. 本地等价验证：

```bash
npm ci && npm run check && npm test
```

3. 处置表：

| 级别  | 检查全绿                                                               | 检查红                                                        |
| ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| patch | 评论「检查通过，可合并」                                               | 评论 @dependabot recreate；持续红则调查是否我们的代码需要适配 |
| minor | 同上                                                                   | 同上；必要时读 release notes 找破坏点                         |
| major | **不自动建议合并**：评论列出 major 变更点 + 需要的人工评估项，交维护者 | 同上                                                          |

4. grouped 更新（dependabot 已按 `groups` 聚合）一次验证即可。

## 输出

PR 评论（结论 + 级别 + 风险项）。

## 异常

| 情况                     | 处置                                         |
| ------------------------ | -------------------------------------------- |
| 依赖含安全告警           | 提到优先级最高，引用告警链接                 |
| major 更新涉及 Node 版本 | 同时核对 `.nvmrc` 与 CI 的 node-version-file |

## 红线

- major 版本不催合并，一律人工评估
- Agent 不改 `package.json` 手动升级（那是 dependabot 的事）
