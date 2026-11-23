# 仓库机制地图

供技能按需查阅的机制参考。权威文档：`docs/CONVENTIONS.md`（规范缘由）、`docs/TEMPLATE.md`（派生指南）、`CONTRIBUTING.md`（贡献流程）。

## 唯一事实源原则

```
data/*.json  ──build──▶  README.md（生成物，禁止手改）
config/*.json ──校验/渲染▶  条目与主题的唯一约束来源
scripts/*.ts  ◀──不含任何项目名，全读 config/meta.json
```

改任何内容 → 改 `data/` 或 `config/` → `npm run build`。直接改 README 会被 `build:check` 拦下。

## 目录职责

| 路径                      | 职责                                                       | 改动方式         |
| ------------------------- | ---------------------------------------------------------- | ---------------- |
| `config/meta.json`        | 品牌：名称、repo、作者、topics、可配置文案                 | scaffold / 手改  |
| `config/categories.json`  | 主题定义与顺序（顺序即 README 顺序）                       | 手改（结构性）   |
| `config/tags.json`        | 标签受控词表（唯一来源）                                   | 手改（结构性）   |
| `config/schema.json`      | 条目字段约束（机器可读）                                   | 手改（结构性）   |
| `config/link-status.json` | 国内链接巡检产物                                           | 机器写入，禁手改 |
| `data/<category>.json`    | 条目数组；文件名必须等于主题 `id` + `.json`                | 手改（日常）     |
| `scripts/*.ts`            | 框架层：build/validate/scaffold/site/check_links/sync_meta | 母版维护         |
| `site/index.html`         | 静态站生成物                                               | 禁手改           |
| `.cache/`                 | 构建缓存                                                   | 禁手改           |

## 命令速查

| 命令                            | 作用                                                       |
| ------------------------------- | ---------------------------------------------------------- |
| `npm run validate`              | 规范校验（schema + 跨条目规则）                            |
| `npm run build` / `build:check` | 重新生成 README / 校验一致性                               |
| `npm run check`                 | CI 全量：validate + build:check + format:check + typecheck |
| `npm test`                      | scaffold 与 site 的单元测试                                |
| `npm run check:links`           | 链接巡检（`--region cn --write` 写盘）                     |
| `npm run scaffold`              | 模板初始化（派生新清单时用一次）                           |
| `npm run build:site`            | 构建静态站到 `site/`                                       |

## 关键不变量

- `id` 创建后永不修改（外部引用依赖它）
- 条目顺序 = JSON 数组顺序，生成器不排序；`featured` 只标 ⭐ 不改位置
- `archived` / `deprecated` 保留在 JSON、不展示、不参与巡检
- 同一 URL 只允许出现一次（忽略尾部斜杠与锚点）
- 框架层改动回母版做，子仓库 cherry-pick 同步，不 merge

## 已知问题（待走 change-management 流程解决）

- `docs/CONVENTIONS.md` 第 3 节列有 `links: {repo, docs}` 字段，但 `config/schema.json` 未定义——条目暂不可填 `links`
- `config/link-status.json` 只存最近一次巡检快照，「连续两周失败才算死链」的连续性判断目前依赖巡检 PR 描述里的观察名单（见 `workflows/weekly-link-audit.md`）；更优解是给 `check_links.ts` 加 `failStreak` 字段（框架层改动，回母版做）
