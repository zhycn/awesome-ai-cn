# ADR-0001：建立 .agents 套件与 AGENTS.md 入口

- 状态：accepted
- 日期：2026-11-23

## 背景

本仓库是 awesome-list 母版，要求 `.agents/` 作为可复制到任意领域的 AI 项目管理套件。初版交付后经三方角色评审（架构师、项目管理与运维专家、质量审查员），发现核心缺口：无根级入口（agent 工具发现不了套件）、流程只覆盖「贡献+链接」两条线、issue 分诊/事件响应/内容审计/变更管理/发布全缺、且初版存在事实错误（见 ADR 附录）。

## 决策

1. 根级 `AGENTS.md` 作为唯一 agent 入口：定位 + 必读指引 + 决策权限矩阵（可自主/须确认/禁止三档）+ 不可变铁律
2. `.agents/workflows/` 补齐八条流程：issue-triage、contribution-review、weekly-link-audit、quarterly-content-audit、change-management、ci-incident-response、dependency-update、release，统一八段模板（目的/触发/输入/角色/步骤/输出/异常/红线）+ frontmatter（name/trigger/owner）
3. 建 `.agents/references/adr/` 决策记录；结构性变更（change-management 流程）强制留痕
4. 建 `.agents/templates/` 标准话术模板，避免 agent 即兴发挥
5. `.agents/config.json` 的 `limits` 段降级为缓存参考，唯一事实源是 `config/schema.json`

## 后果

- 正面：套件从「内容维护手册」升级为覆盖贡献、审计、变更、事件、发布全生命周期的管理标准；任何 agent 工具可通过 AGENTS.md 自动发现
- 负面 / 代价：流程文档数量 ×4，维护成本上升；八段模板对新流程有写作门槛
- 风险与缓解：流程与现实漂移——每季度内容审计时顺带核对流程有效性；缓解过度设计——每条流程绑定仓库真实存在的机制（issue 模板、workflows、dependabot）

## 替代方案

- 每条流程写进对应 skill：被否——skill 是单任务手册，流程是多角色多步骤组合，混在一起两边都不可读
- 用 GitHub Projects/labels 管理流程状态：被否——引入平台依赖，违反「复制即用」原则
