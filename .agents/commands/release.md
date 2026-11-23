---
name: release
description: 发布一个版本（bump + tag + 发布记录）
---

# /release

输入：可选的目标版本号；缺省由维护者确认。

执行 [`../workflows/release.md`](../workflows/release.md)：

1. `git log` 收集自上个 tag 的变更，按流程的版本号表提议 major/minor/patch，**等维护者确认**
2. bump `package.json` + `npm install --package-lock-only` 同步 lock
3. `npm run check && npm test` 全绿
4. 准备 annotated tag 命令，push 由维护者执行或明确授权后执行
