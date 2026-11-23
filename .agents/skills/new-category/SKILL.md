---
name: new-category
description: 提议并落地一个新的主题（category），从必要性讨论到 config/categories.json 修改与 data 骨架创建。当用户要求"新增一个主题/分类/section"时使用。
---

# 新增一个主题

## 原则

新增主题是**结构性改动**，比加条目重得多：影响目录、README 骨架与所有读者的导航。先确认必要性，再动手。

## 步骤

### 1. 必要性检查（先问再改）

新主题必须同时满足：

- 边界清晰：能用一句话说清「收什么、不收什么」
- 装得下：预计可持续收录 5+ 条
- 不重叠：现有主题装不下的理由成立（对照 `config/categories.json` 逐个检查）
- 顺序有理由：新主题在目录里的位置要讲得通

任一条不满足 → 建议把条目放进现有主题（必要时打标签细分），并说明理由。

### 2. 定义主题

在 `config/categories.json` 的 `categories` 数组**合适位置**（顺序即 README 顺序）插入：

```json
{
  "id": "14-xxx",
  "title": "标题",
  "emoji": "🧩",
  "file": "14-xxx.json",
  "description": "什么时候该看这节（而不是这节收什么）。"
}
```

规则：

- `id` = `file` 文件名（去掉 `.json`），校验器会强制核对；两位数字前缀是本仓库的排序惯例（校验器不强制，但保持既有风格）
- `description` 写「什么时候该看这节」，渲染为斜体一句话

### 3. 建数据文件

在 `data/` 下创建 `<id>.json`，初始为空数组 `[]`（`scaffold --categories` 也可代劳，但手动建更直观）。

### 4. 校验与再生成

```bash
npm run validate
npm run build
npm run build:check
npm run format
npm test
```

### 5. 提交

结构性改动单独成 PR：`feat: 新增主题「标题」`。PR 描述里写清必要性论证（第 1 步的结论）。

## 不要做

- 不要为了塞一两条"放不进现有主题"的条目就开新主题
- 不要在同一个 PR 里同时加主题和加条目（先合主题，再加条目）
- 不要改现有主题的 `id`——外部可能引用
