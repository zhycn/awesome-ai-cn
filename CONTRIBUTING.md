# 贡献指南

感谢你愿意贡献条目。本项目的内容都在 `data/*.json` 里，`README.md` 由脚本生成——**不要直接改 README**。

## 三种贡献方式

### 1. 新增一条资源

```bash
# 1) fork 并克隆
git clone https://github.com/<你的名字>/awesome-ai-cn.git && cd awesome-ai-cn

# 2) 在对应主题的 JSON 末尾追加一条
#    编辑 data/<主题>.json，追加一个对象
# 3) 安装依赖（首次）并校验 + 重新生成 README
npm ci
npm run validate
npm run build
npm run build:check

# 4) 格式化 Markdown
npm run format

# 5) 提交 PR
```

条目的字段说明见 [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md)，机器可读定义见 [`config/schema.json`](config/schema.json)。

最小可用示例：

```json
{
  "id": "your-tool",
  "name": "Your Tool",
  "url": "https://example.com",
  "desc": "一句话说清它是什么、凭什么值得收",
  "tags": ["国产"],
  "pricing": "freemium",
  "status": "active",
  "added": "2026-11-22"
}
```

`tags` 可省略（填不出合适的就整条不填）；`added` 填你提交当天的日期。示例里的 `https://example.com` 请换成项目真实入口。

### 2. 修正失效链接或过时描述

直接改对应 JSON 即可。如果项目已停止维护，把 `status` 改成 `archived`，不要删除条目——机器消费方仍需要历史信息；`archived` 条目不会再被链接巡检骚扰。

### 3. 提议新主题

先开 issue 说明「收什么、不收什么、为什么现有主题装不下」，达成一致后再改 `config/categories.json`。

## 收录标准

**收**：

- 中文用户能直接使用，或国际主流且有完善中文文档
- 仍在维护（12 个月内有更新）
- 有明确、稳定、可直达的官网或仓库

**不收**：

- 纯营销页、套壳产品、需要邀请码且无法申请的
- 第三方 API 中转 / 倒卖 token 的站点（无主体、无 SLA、随时跑路）
- 已经在其他主题收录过的同一项目（同一 URL 会被自动拦截，忽略尾部斜杠与 #锚点）

## PR 检查清单

- [ ] `npm run validate` 通过
- [ ] `npm run build` 已运行，README 与数据一致（`npm run build:check` 无差异）
- [ ] `desc` 是陈述句、不加句号、不超过 60 字（句号只给建议，不阻断 CI）
- [ ] `tags` 只用了受控词表里的词，且同一主题内人人都有的能力没有打标签
- [ ] 新条目追加在主题末尾（顺序由维护者调整）
- [ ] 一个 PR 只做一件事（加条目 / 修链接 / 改结构分开提）
- [ ] `npm run format:check` 通过（Prettier 只校验手写文档，README 是生成物不入此列）
- [ ] CI 变绿（`validate`、`build --check`、`format:check` 会自动跑）

## 关于排序

README 里条目的顺序就是 JSON 数组的顺序，由维护者人工编排。新增条目默认追加到末尾，合并后由维护者挪到合适位置——你不需要纠结放哪。

## 提交信息

遵循 `feat:` / `fix:` / `docs:` / `chore:` 前缀，一句话说清改了什么，例如：

```
feat: 收录 Cursor、Cline 等 5 个 AI 编程工具
fix: 修正 Kimi 官网域名
```

## 用这套工具开新清单

本仓库同时是 awesome list 母版：`scripts/` 里没有项目名和作者，全部读 `config/meta.json`。想派生一个新主题的清单，看 [`docs/TEMPLATE.md`](docs/TEMPLATE.md)。
