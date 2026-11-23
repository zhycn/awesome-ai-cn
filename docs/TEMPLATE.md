# 用这个模板开一个新的清单

本仓库同时是「一份 AI 清单」和「一套 awesome list 母版」。下面讲怎么用它派生新清单。

## 框架层与内容层

| 层     | 文件                                                                                                                                                                                                                                     | 新清单是否要改 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 框架层 | `scripts/*.ts`、`scripts/site.css`（Tailwind v4）、`tests/`、`tsconfig.json`、`commitlint.config.mjs`、`.prettier*`、`.editorconfig`、`.nvmrc`、`.gitignore`、`.gitattributes`、`.github/*`、`AGENTS.md`、`.agents/*`（AI 项目管理套件） | 否             |
| 内容层 | `config/meta.json`、`config/categories.json`、`config/tags.json`、`config/schema.json` 的 `$id`/标题、`data/*.json`、`LICENSE`、`SECURITY.md` 的署名                                                                                     | 是             |

`scripts/` 不含任何项目名、作者、仓库地址——全部从 `config/meta.json` 读取。

## 方式一：GitHub 模板（推荐）

1. 仓库页 → **Use this template** → Create a new repository（不要 Fork，fork 会带上原仓库历史）
2. `git clone <新仓库> && cd <新仓库> && npm ci`
3. 运行初始化：

```bash
npm run scaffold -- \
  --name "Awesome Rust CN" \
  --slug awesome-rust-cn \
  --repo https://github.com/you/awesome-rust-cn \
  --author you \
  --topics rust,rust-lang,awesome-list \
  --force      # 模板自带示例内容，不加会被拦下
```

4. 编辑 `config/categories.json` 与 `data/*.json` 录入内容
5. `npm run validate && npm run build`
6. 提交推送

## 方式二：本地复制

```bash
cp -R <母版目录> awesome-rust-cn && cd awesome-rust-cn
rm -rf .git && git init
npm ci
npm run scaffold -- --name "Awesome Rust CN" --slug awesome-rust-cn \
  --repo https://github.com/you/awesome-rust-cn --author you
```

## scaffold 参数

| 参数            | 必填 | 说明                                         |
| --------------- | ---- | -------------------------------------------- |
| `--name`        | ✅   | 清单名称，如 `Awesome Rust CN`               |
| `--slug`        | ✅   | 仓库/包名，小写连字符                        |
| `--repo`        | ✅   | 仓库地址，用于徽章、SECURITY 链接            |
| `--author`      | ✅   | 版权署名，写入 LICENSE 与 README 页脚        |
| `--license`     |      | 许可证标识，默认 `MIT`                       |
| `--tagline`     |      | 一句话定位，默认由名称推导                   |
| `--description` |      | 描述，默认由名称推导                         |
| `--topics`      |      | GitHub topics，逗号分隔，默认 `awesome-list` |
| `--categories`  |      | 主题定义 JSON 文件，给定后重建 `data/` 骨架  |
| `--keep-data`   |      | 保留现有条目                                 |
| `--dry-run`     |      | 只打印将要执行的改动                         |
| `--force`       |      | `data/` 非空时仍需清空                       |

## categories.json 格式

```json
[{ "id": "01-basics", "title": "入门", "emoji": "🌱", "description": "一句话说明收什么。" }]
```

`scaffold` 会把 `file` 补成 `<id>.json`，并在 `data/` 下建立空数组文件。

## scaffold 会顺带改这些

除 `config/meta.json` 外，它还会同步：

- `package.json` 与 `package-lock.json` 的包名
- `config/schema.json` 的 `$id` 与标题
- `SECURITY.md` 的漏洞上报链接
- `LICENSE` 的版权年份与署名
- `CONTRIBUTING.md` 里出现的旧仓库名

## About / Topics 自动同步

仓库右上角的简介与 topics 由 `config/meta.json` 的 `about` 和 `topics` 驱动，改完 push 到 main 会自动同步：

```json
{
  "about": "给中文开发者的 AI 资源地图：模型、工具、产品与学习资料",
  "topics": ["awesome-list", "ai"]
}
```

启用步骤（只需一次）：

1. 建一个 PAT（fine-grained 需勾 **Administration: Read and write**；经典 token 勾 `repo`）
2. 仓库 → Settings → Secrets and variables → Actions → 新建 `META_TOKEN`
3. 之后改 `meta.json` 即可；也可在 Actions 里手动跑 `Sync repo metadata`

> 没配 `META_TOKEN` 时脚本会静默跳过——派生仓库不做这一步也不会让 CI 变红。

## 静态站点（GitHub Pages）

仓库自带一个零依赖的静态站生成器 `scripts/site.ts`，输出 `site/`：

```bash
npm run build:css       # Tailwind 编译样式到 .cache/site.css
npm run build:site      # 编译样式并生成单文件 site/index.html
```

样式用 Tailwind v4 的组件层（`@layer components` + `@apply`）+ `@theme` token，设计变量集中在 `scripts/site.css` 顶部，深浅色成对维护。

- 支持关键词搜索（按 `/` 聚焦）、主题跳转、🌐 标记、深色模式
- 推送涉及 `config/`、`data/`、`scripts/site.ts` 的改动时，`pages.yml` 会自动构建并部署
- 首次启用：仓库 Settings → Pages → Source 选 **GitHub Actions**

## 新仓库的 GitHub 设置（仓库里改不了）

- **Description / Topics**：用 `meta.json` 里的 `description` 和 `topics`
- **分支保护**：Settings → Branches → Add rule，至少勾选「Require a pull request」+「Require status checks → check」
- **Actions**：Settings → Actions → General，把默认 token 设为只读；外部贡献者 PR 需批准后才跑
- **安全**：开启 Secret scanning、Dependabot alerts、Private vulnerability reporting
- 想让自己也被模板化：Settings 勾选 **Template repository**

## 升级模板

框架层改动建议在母版仓库做，再同步到各清单：

```bash
git remote add template https://github.com/zhycn/awesome-ai-cn.git
git fetch template
git cherry-pick <母版提交>       # 只挑 scripts/ 与 .github/ 的提交
```

不要直接 `merge` 母版分支——会把 AI 内容带进来。

## 自检清单

- [ ] `npm run validate` 通过
- [ ] `npm run build:check` 无差异
- [ ] `npm run typecheck` 通过
- [ ] `npm run format:check` 通过
- [ ] `npm test` 通过
- [ ] 在国内网络跑一次 `npm run check:links -- --region cn --write`，确认 `access` 标记正确
- [ ] `README.md` 标题、徽章、页脚署名正确
- [ ] `LICENSE` 与 `SECURITY.md` 已换成本仓库
- [ ] GitHub description / topics / 分支保护 / Actions 权限 已配置
