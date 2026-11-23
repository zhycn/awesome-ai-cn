---
name: check-links
description: 巡检清单中的外部链接，判断死链与国内可达性并维护 access 标记。当用户要求"检查链接/巡检/为什么有条目打不开"时使用。区分 overseas 与 cn 两种巡检视角。
---

# 链接巡检与 access 标记

## 两种视角，不要混用

| 视角     | 运行环境      | 能判断什么      | 写入文件                  |
| -------- | ------------- | --------------- | ------------------------- |
| overseas | GitHub Runner | 存活 / 死链     | 不写文件（CI 告警）       |
| cn       | 本机国内网络  | 直连 / 需要代理 | `config/link-status.json` |

## 操作

### 国内视角（本机跑）

```bash
npm run check:links -- --region cn --write
```

- 结果写入 `config/link-status.json`（机器维护，不要手改）
- 国内不可达、海外可达 → 条目标 `"access": "proxy"`（README 显示 🌐）
- 两地都不可达 → 死链，按下面"处置"处理

### 海外视角

CI 每周自动跑（`.github/workflows/links.yml`），本地一般不用手动跑。

## 死链处置口径

按优先级：

1. **URL 变了** → 更新 `url`，保留原 `id`
2. **项目停维** → `status` 改 `archived`，**不要删除条目**（机器消费方需要历史；archived 条目自动退出巡检和 README 展示）
3. **暂态失败** → 重跑一次再下结论；连续两周失败才按死链处理

## 注意

- 修改任何条目后照常 `npm run validate && npm run build`
- 巡检结果与用户手工标的 `access` 冲突时，以最近一次巡检为准，但要向用户说明再写入
