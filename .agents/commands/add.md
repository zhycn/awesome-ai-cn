---
name: add
description: 收录一条资源到清单（用户给出项目名与链接）
---

# /add

用户给出一个项目（名称 + URL，可选简介/标签），把它收录进清单。

执行 [`../skills/add-entry/SKILL.md`](../skills/add-entry/SKILL.md)：

1. 主题归属不明确时先问用户，不要猜
2. 按技能起草条目 → 追加到对应 `data/*.json` 末尾 → `npm run validate && npm run build`
3. 展示最终条目与校验结果，给出建议提交信息（`feat: 收录 <名称>`）

若用户没给链接或链接打不开，先向用户要稳定入口，不要收录存疑链接。
