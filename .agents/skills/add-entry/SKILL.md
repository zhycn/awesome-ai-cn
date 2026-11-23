---
name: add-entry
description: 在本 awesome list 仓库新增一条资源条目。当用户要求"收录/新增/添加一个项目/工具/链接"到清单时使用。覆盖字段填写、标签选择、追加位置与提交前校验的完整流程。
---

# 新增一条资源

## 何时使用

用户给出一个项目（名称 + 链接，可能还有简介），想把它收录进清单。

## 前置判断

1. 读 `config/meta.json` 了解清单定位；读 `config/categories.json` 找到最合适的一个主题。**不确定放哪个主题时，先问用户，不要猜。**
2. 对照收录标准（见 `CONTRIBUTING.md`）：
   - 入口链接稳定、可直达、非营销页
   - 12 个月内有更新（`status: active` 的前提）
   - 不与现有条目重复（`npm run validate` 会查 id/URL 重复）
3. 需要科学上网才能访问的服务照收，但要标 `"access": "proxy"`。

## 步骤

### 1. 起草条目

字段约束的机器定义在 `config/schema.json`，写作规则全文在 `docs/CONVENTIONS.md`。速查表见 [`../../references/field-cheatsheet.md`](../../references/field-cheatsheet.md)。

最小条目：

```json
{
  "id": "your-tool",
  "name": "Your Tool",
  "url": "https://example.com",
  "desc": "一句话说清它是什么、凭什么值得收",
  "tags": ["<从 config/tags.json 词表挑>"],
  "pricing": "freemium",
  "status": "active",
  "added": "2026-11-23"
}
```

要点：

- `id`：全局唯一小写连字符 slug，**创建后永不再改**
- `desc`：6–60 字陈述句，不加句号，禁营销词（最强/颠覆/一站式/神器），不要以名称开头重复
- `tags`：只能取 `config/tags.json` 受控词表，1–3 个，**宁少勿滥**；同一主题内人人都有的能力不打标签
- `pricing`：`free` / `freemium` / `paid` / `open-source`
- `added`：提交当天日期 `YYYY-MM-DD`
- `vendor` / `lang` / `access`：仅在必要时填（`links: {repo, docs}` 在 schema 中尚未定义，目前不可用——见 field-cheatsheet 的已知问题）

### 2. 写入数据文件

- 追加到 `data/<主题id>.json` 数组**末尾**（顺序由维护者人工编排，Agent 不主动插入中间）
- 用 `npm run format` 保持 JSON 格式一致

### 3. 校验与再生成

```bash
npm run validate
npm run build
npm run build:check
npm run format
```

任何一步报错：按 `docs/CONVENTIONS.md` 第 9 节的报错对照表修正，**不要**为了过校验去改 `config/schema.json`。

### 4. 汇报

向用户展示最终条目 JSON 与校验结果。提交信息示例：`feat: 收录 Your Tool`（Conventional Commits，PR 标题会被 commitlint 校验）。

## 不要做

- 不要直接编辑 `README.md`（它是 `npm run build` 的产物）
- 不要替用户决定主题归属不明时的去向
- 不要给 `archived` 的项目新增条目；确认已停维就直接建议不收
