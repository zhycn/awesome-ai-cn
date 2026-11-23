---
name: check
description: 对仓库跑全量自检（校验、构建一致性、格式、类型、测试）
---

# /check

跑全量自检，等价于 CI：

```bash
npm run check    # validate + build:check + format:check + typecheck
npm test
```

对每一步的失败：

- validate → 按 `docs/CONVENTIONS.md` 第 9 节报错对照表修正数据
- build:check → 改了 `data/`/`config/` 没重新生成 README：跑 `npm run build`
- format:check → 跑 `npm run format`
- 其余 → 修到全绿为止，不要跳过

最后用一段话汇报：改了哪些文件、哪些检查从红变绿。若涉及链接问题，走 `check-links` 技能的链接巡检（cn 视角），或 `weekly-link-audit` 流程。
