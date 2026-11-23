---
name: release
trigger: 维护者决定发布新版本
owner: 维护 Agent → 维护者
---

# 流程：版本发布

## 目的

本仓库无独立发布产物（README/站点随 main 即时生效），版本号的语义是**框架层里程碑**：标记模板能力演进，供派生仓库选择同步点。发布流程保证版本号、tag、站点与文档一致。

## 触发

- 维护者说「发布 / release / bump version」
- 框架层累积了值得标记的变更（结构性变更合并后）

## 输入

自上个 tag 以来的提交历史（`git log <last-tag>..main`）。

## 角色

- **维护 Agent**：整理变更、bump、打 tag 的准备
- **维护者**：确认版本号、执行 push tag（或授权 Agent）

## 步骤

1. **收集变更**：

```bash
git describe --tags --abbrev=0   # 上个 tag
git log <上个tag>..main --oneline
```

2. **定版本号**（维护者确认）：

| 变更                                      | 版本                            |
| ----------------------------------------- | ------------------------------- |
| 框架层破坏性（schema 语义变、脚本行为变） | major/minor（0.x 阶段用 minor） |
| 框架层新增能力（新脚本、新校验）          | minor                           |
| 纯内容层（条目、文案）                    | patch                           |

3. **bump**：改 `package.json` 的 `version`（只这一处，不手改 package-lock —— `npm install --package-lock-only` 同步）。

4. **全量检查**：`npm run check && npm test`。

5. **发布记录**：结构性变更在 `.agents/references/adr/` 已有 ADR；无 ADR 的普通发布用 tag 的 annotated message 概括（`chore(release): v0.2.0`）。

6. **打 tag 并推送**（维护者执行或授权）：

```bash
git tag -a v0.2.0 -m "框架层：<一句话>"
git push origin main --tags
```

7. **推送后验证**：CI 绿、pages 部署成功（`sync-meta` 只在 `meta.json` 变更时跑，与版本号无关）。

## 输出

tag + 更新的 `package.json`。

## 异常

| 情况               | 处置                                          |
| ------------------ | --------------------------------------------- |
| 忘了 bump 就打 tag | 删除未推送的 tag 重来；已推送的用下一个版本补 |
| tag 后发现 CI 红   | 修复后删除远程 tag 重新打（未广泛传播前）     |

## 红线

- 版本号只反映框架层，内容层变更不 bump（它们随 main 即时生效）
- Agent 未经授权不 push tag
