# .agents — 本仓库的标准 AI 套件

这个目录存放管理本模板项目（awesome list 母版）的一组**通用** AI 能力：skills（技能）、commands（指令）、workflows（流程）、references（参考资料）、templates（模板）。

> 设计原则：所有内容只引用 `scripts/`、`config/`、`data/`、`docs/` 中的**机制**，不包含任何具体领域的条目内容。把本仓库 scaffold 成任意新领域的清单后，这套 `.agents` 原样可用。

## 入口

Agent 的根级入口是 [`../AGENTS.md`](../AGENTS.md)（含决策权限矩阵与不可变铁律）。本文件是套件的总索引。

## 目录结构

```text
.agents/
├── README.md              # 本文件：总览、索引与写作标准
├── config.json            # 套件自身的配置（路径约定、检查命令）
├── skills/                # 技能：单一任务的完整操作手册
│   ├── add-entry/         # 新增一条资源
│   ├── review-entry/      # 审阅一条待合并的条目
│   ├── check-links/       # 链接巡检与 access 标记
│   ├── new-category/      # 提议并落地一个新主题
│   └── derive-list/       # 用母版派生新领域清单
├── commands/              # 指令：面向用户的快捷入口
│   ├── add.md             # /add 收录一条资源
│   ├── check.md           # /check 全量自检
│   ├── review.md          # /review 审阅一个 PR
│   ├── plan.md            # /plan 规划结构性改动
│   ├── triage.md          # /triage 分诊 issue
│   └── release.md         # /release 版本发布
├── workflows/             # 流程：多步骤、多角色的组合过程（统一八段模板，见下）
│   ├── issue-triage.md            # issue 分诊（三类 issue → 技能/流程）
│   ├── contribution-review.md     # PR 审阅全流程
│   ├── weekly-link-audit.md       # 每周链接巡检
│   ├── quarterly-content-audit.md # 季度条目时效审计
│   ├── change-management.md       # 结构性变更管理
│   ├── ci-incident-response.md    # CI/平台事件响应
│   ├── dependency-update.md       # dependabot PR 处置
│   └── release.md                 # 版本发布
├── references/            # 参考资料：供技能按需查阅
│   ├── project-map.md     # 仓库机制地图（唯一事实源原则）
│   ├── field-cheatsheet.md# 字段速查与写作规则
│   └── adr/               # 决策记录（ADR），编号递增不可改
└── templates/             # 模板：PR 描述、issue 回复的标准话术
    ├── pr-structural.md   # 结构性 PR 的必要性论证模板
    └── issue-replies.md   # issue 标准回复（收录/拒绝/追问/误报）
```

## 与仓库文档的关系

| 文档                     | 角色                                     |
| ------------------------ | ---------------------------------------- |
| `AGENTS.md`（根）        | Agent 入口：定位、权限矩阵、铁律         |
| `CONTRIBUTING.md`        | 面向**人类贡献者**的入口                 |
| `docs/CONVENTIONS.md`    | 规范的**权威解释**（为什么这样写）       |
| `config/schema.json`     | 字段约束的**机器可读定义**               |
| `.agents/`               | 面向 **AI Agent** 的操作手册             |

技能内容与 `docs/CONVENTIONS.md` 保持一致但不重复解释缘由——技能引用文档，文档才是唯一事实源。规范变更时先改 `docs/` 与 `config/`，再同步技能。

## 写作标准

### 技能（skills/*/SKILL.md）

- frontmatter：`name`（= 目录名）、`description`（含触发场景，第三人称）
- 正文：何时使用 → 步骤 → 不要做。单一任务，不组合多角色。

### 指令（commands/*.md）

- frontmatter：`name`、`description`。正文一句话定位 + 分发到技能/流程，**不重复技能内容**。

### 流程（workflows/*.md）—— 统一八段模板

新流程必须八段齐全才能进 `workflows/`，frontmatter 元信息（name/trigger/owner）用于机器枚举：

```markdown
---
name: <流程名>
trigger: <什么事件/条件触发>
owner: <责任角色>
---

# 流程名

## 目的
## 触发
## 输入
## 角色
## 步骤（含分支表）
## 输出
## 异常
## 红线
```

## 约定

- **技能优先**：Agent 接到任务后，先在 `skills/` 找匹配技能；技能不足再读 `references/`。
- **命令是入口**：用户说 `/add xxx` 时按 `commands/add.md` 分发到对应技能。
- **不自创规范**：任何字段、标签、枚举的判断都以 `config/schema.json`、`config/tags.json` 与 `npm run validate` 的输出为准，Agent 不得凭记忆放行。
- **改数据不改产物**：Agent 永远只改 `data/`、`config/`，再跑 `npm run build`；绝不直接编辑 `README.md` 与 `site/`。
- **结构性决策留痕**：任何 schema/tags/categories/scripts 层面的变更走 `workflows/change-management.md` 并在 `references/adr/` 落一份 ADR。
- **上限类数字以 schema 为准**：`config.json` 的 `limits` 段仅缓存展示，字段约束以 `config/schema.json` 为唯一事实源。
