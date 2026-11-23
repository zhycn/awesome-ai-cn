---
name: derive-list
description: 用本母版仓库派生一个全新领域的 awesome list，从 scaffold 初始化到 GitHub 设置检查的全流程。当用户说"我要用这个模板开一个新清单/复制到某领域"时使用。
---

# 用母版派生新清单

## 框架层与内容层

| 层     | 文件                                                                                                | 要改吗 |
| ------ | --------------------------------------------------------------------------------------------------- | ------ |
| 框架层 | `scripts/`、`tests/`、`.github/`、`.prettier*`、`tsconfig.json` 等                                  | 否     |
| 内容层 | `config/meta.json`、`config/categories.json`、`config/tags.json`、`data/`、`LICENSE`、`SECURITY.md` | 是     |

`scripts/` 不含任何项目名与作者，全部读 `config/meta.json`——所以只需 scaffold 一次 + 填内容。

`.agents/` 与根级 `AGENTS.md` 属于框架层，随仓库复制原样保留。

## 派生时需要重估的隐性假设

套件机制通用，但以下**内容层假设**派生到非「中文 + 国内网络」场景时需要决策（逐项过一遍，结论写进派生仓库的第一个 ADR）：

| 假设                           | 位置                                         | 派生时的决策点                                                            |
| ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------- |
| `access`/`proxy`/🌐 双视角巡检 | `check-links` 技能、`weekly-link-audit` 流程 | 面向单一网络环境的清单可整体去掉 cn 视角与 `access` 字段                  |
| `lang` 默认 `zh`、desc 为中文  | schema、`CONVENTIONS.md`                     | 非中文清单改 schema 的 `lang` 枚举与 desc 写作规则                        |
| `-cn` 命名后缀                 | 本技能示例、`docs/TEMPLATE.md` 示例          | 按目标受众命名，不强制                                                    |
| 收录标准「中文用户可直接使用」 | `CONTRIBUTING.md`、issue 模板                | 换成目标受众的可用性标准                                                  |
| `tags` 词表内容                | `config/tags.json`                           | 唯一真正的领域知识载体，必须整体重设计（见 `CONVENTIONS.md` 第 6 节原则） |

## 步骤

### 1. 复制仓库

推荐 GitHub 模板方式（Use this template，不要 Fork）；本地方式：

```bash
cp -R <母版> awesome-<领域>-cn && cd awesome-<领域>-cn
rm -rf .git && git init && npm ci
```

### 2. scaffold 初始化

```bash
npm run scaffold -- \
  --name "Awesome Rust CN" \
  --slug awesome-rust-cn \
  --repo https://github.com/you/awesome-rust-cn \
  --author you \
  --topics rust,awesome-list \
  --force
```

它会同步 `meta.json`、`package.json`、`schema.json` 的 `$id`、`LICENSE`、`SECURITY.md` 等。全部参数见 `docs/TEMPLATE.md`。

### 3. 定义主题骨架

编辑 `config/categories.json` 为新领域的主题（写法见 `new-category` 技能），或准备一个 categories JSON 传给 `--categories` 重建 `data/` 骨架。

### 4. 定制标签词表

编辑 `config/tags.json`：受控词表是新领域真正的"领域知识"，按 `docs/CONVENTIONS.md` 第 6 节的原则（标签只回答"什么是别的字段推不出来的"）重新设计，不要照搬 AI 领域的词。

### 5. 录入内容并自检

```bash
npm run check
```

### 6. GitHub 设置（仓库里改不了，提醒用户）

- Description / Topics 用 `meta.json` 的值；配 `META_TOKEN` 后可自动同步
- 分支保护：Require PR + status checks（`check`）
- Pages：Settings → Pages → Source 选 GitHub Actions
- 想模板化：勾选 Template repository

## 升级模板

框架层改动回母版做，子仓库用 cherry-pick 同步（只挑 `scripts/` 与 `.github/` 的提交），不要 merge 母版分支——会把旧领域内容带进来。
