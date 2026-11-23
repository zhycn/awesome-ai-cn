# PR 描述模板：结构性改动

> 适用于 schema / tags 词表 / categories / scripts 框架层改动。纯条目 PR 不要用本模板。

## 做了什么

<!-- 一句话说明这个 PR 的目的 -->

## 必要性论证

<!-- 为什么非改不可？现有机制为什么装不下？ -->

## 关联 ADR

<!-- .agents/references/adr/NNNN-xxx.md，结构性改动必填 -->

## 影响面

<!-- 动了哪些文件；对现有数据/下游消费方/派生仓库的影响；破坏性变更标注 -->

## 迁移指引

<!-- 破坏性变更必填：下游（含派生仓库）需要做什么 -->

## 检查清单

- [ ] ADR 已落 `.agents/references/adr/`
- [ ] `docs/CONVENTIONS.md` 相应章节已同步
- [ ] 全量数据通过 `npm run validate`
- [ ] `npm run check` 通过；框架层改动加 `npm test`
- [ ] 一个 PR 一件事
