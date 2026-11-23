---
name: review
description: 审阅一个 PR 或条目改动（按 review-entry 技能的清单逐项检查）
---

# /review

输入：一个 PR（编号或 diff），或用户描述的条目改动。

执行 [`../skills/review-entry/SKILL.md`](../skills/review-entry/SKILL.md)：

1. 拉取/查看改动内容（新增、修正、状态变更分别对待）
2. 按技能的四段清单（收录标准 / 字段合规 / 结构纪律 / 产物一致性）逐项核对
3. 结论为「通过 / 需修改 / 拒绝」+ 修改建议（可直接照抄的 JSON）

不要因为 `npm run validate` 通过就放行——校验器管不住写作口吻、标签纪律和收录标准，这些靠审阅清单兜底。
