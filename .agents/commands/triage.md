---
name: triage
description: 分诊一个 issue（推荐条目 / 失效链接 / link-check 巡检）
---

# /triage

输入：一个 issue（编号或内容），或「看看有什么新 issue」。

执行 [`../workflows/issue-triage.md`](../workflows/issue-triage.md) 的分诊表：

1. 判定类型（`[条目]` 推荐 / `[失效]` 报告 / `link-check` 巡检 / 其他）
2. 按流程走对应分支：推荐 → `add-entry` 技能草稿 PR；失效 → `check-links` 死链口径；link-check → `ci-incident-response` 流程
3. 在 issue 留下署名评论（已代提 PR / 需补充信息 / 已移交），**不关闭 issue、不承诺收录**
