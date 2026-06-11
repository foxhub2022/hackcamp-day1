# LiquidityForge 实施计划

> 基于 [product-research.md](./product-research.md) Idea 3  
> 创建日期：2026-06-11  
> 状态：进行中

---

## 一、项目概述

**LiquidityForge** — 长尾垂直市场 AI 做市 + 流动性供给 Agent。

监控宏观日历（Fed、CPI、非农等），在 Polymarket 上自动匹配对应市场，以 GTC 限价单在 bid-ask 两侧被动做市，并根据订单簿深度与公允价动态调整 spread。

| 项 | 内容 |
|----|------|
| 代码目录 | `day2/liquidityforge/` |
| 技术基座 | [clob-client-v2](https://github.com/Polymarket/clob-client-v2) |
| 首发垂直 | Fed 利率决议（流动性较好、日历固定、Demo 好讲） |
| 参考调研 | [product-research.md](./product-research.md) § Idea 3 |

---

## 二、架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 项目位置 | `day2/liquidityforge/` | 与 day2 调研同目录，独立可运行 |
| 技术栈 | TypeScript + tsx + viem + clob-client-v2 | 与 day1 一致，直接对接 Polymarket CLOB V2 |
| 首发垂直 | Fed 利率决议 | 流动性较好、事件时间固定、适合黑客松 Demo |
| 运行模式 | Paper（默认）/ Live | 无私钥也能跑通 Demo；配置 `.env` 后切换实盘 |
| Fair Value | 规则引擎（midpoint + 事件临近度 + 深度） | MVP 不依赖 LLM API，降低复杂度 |
| 界面 | CLI + 结构化日志 | 两周 MVP 优先闭环，暂不做前端 |

---

## 三、数据流

```
宏观日历
    ↓
Gamma API 搜市场（Fed / CPI / 利率关键词）
    ↓
clob-client-v2 读订单簿 → 计算 midpoint
    ↓
Fair Value 引擎（公允价 + 动态 spread）
    ↓
双边 GTC 挂单（Paper 模拟 / Live 实盘）
    ↓
监听成交流 → spread 收窄或 widen → 撤单重挂
```

---

## 四、Todo 清单

| # | 任务 | 产出 | 状态 |
|---|------|------|------|
| 1 | 项目脚手架 | `package.json` / `tsconfig.json` / `.env.example` | ⬜ 待开始 |
| 2 | Gamma API 市场发现 | 按 Fed/CPI/利率关键词搜索并匹配 Polymarket 市场 | ⬜ 待开始 |
| 3 | 宏观日历模块 | 内置 Fed 决议 / CPI / 非农等近期事件时间表 | ⬜ 待开始 |
| 4 | 订单簿读取 | `getOrderBook` + midpoint 计算 | ⬜ 待开始 |
| 5 | Fair Value 引擎 | midpoint + 事件临近度 + 深度 → 公允价 | ⬜ 待开始 |
| 6 | 做市核心逻辑 | 双边 GTC 挂单、动态 spread、撤单/重挂 | ⬜ 待开始 |
| 7 | Paper 模式（默认） | 模拟挂单与成交，无需私钥即可 Demo | ⬜ 待开始 |
| 8 | Live 模式 | `.env` 配置私钥 + CLOB API，真实下单（小额） | ⬜ 待开始 |
| 9 | Agent 主循环 | 日历触发 → 选市场 → 做市 → 结构化日志 | ⬜ 待开始 |
| 10 | README | 架构说明、运行方式、环境变量、Demo 指引 | ⬜ 待开始 |

---

## 五、目录结构（规划）

```
day2/liquidityforge/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── index.ts              # Agent 主入口
    ├── config.ts             # 环境变量与常量
    ├── calendar/
    │   └── macro-events.ts   # 宏观事件日历
    ├── market/
    │   ├── gamma.ts          # Gamma API 市场发现
    │   └── orderbook.ts      # 订单簿读取与 midpoint
    ├── pricing/
    │   └── fair-value.ts     # Fair Value + spread 计算
    └── maker/
        ├── engine.ts         # 做市核心逻辑
        ├── paper.ts          # Paper 模式模拟
        └── live.ts           # Live 模式实盘下单
```

---

## 六、环境变量（规划）

| 变量 | 必填 | 说明 |
|------|------|------|
| `MODE` | 否 | `paper`（默认）或 `live` |
| `PRIVATE_KEY` | Live 必填 | Polygon 钱包私钥 |
| `CLOB_API_KEY` | Live 可选 | L2 API Key（可运行时 derive） |
| `CLOB_SECRET` | Live 可选 | L2 API Secret |
| `CLOB_PASS_PHRASE` | Live 可选 | L2 API Passphrase |
| `CLOB_HOST` | 否 | 默认 `https://clob.polymarket.com` |
| `ORDER_SIZE` | 否 | 单边挂单量（USDC），默认 `10` |
| `BASE_SPREAD` | 否 | 基础 spread（美分），默认 `4` |

---

## 七、MVP Demo 路径

| 阶段 | 天数 | 内容 |
|------|------|------|
| Phase 1 | Day 1–3 | 脚手架 + Gamma 搜市场 + 读订单簿（Paper） |
| Phase 2 | Day 4–7 | Fair Value + 双边 GTC 做市逻辑 + 动态 spread |
| Phase 3 | Day 8–10 | Agent 主循环 + 宏观日历联动 + 日志 Dashboard |
| Phase 4 | Day 11–14 | Live 模式小额验证 + README + 视频 Demo |

---

## 八、风险与应对

| 风险 | 应对 |
|------|------|
| 长尾市场无对应合约 | 降级为「市场匹配建议」，日志输出候选 |
| 做市逆向选择 | Paper 模式先验证 spread 策略；Live 限制单笔上限 |
| 资本占用高 | 默认 `ORDER_SIZE=10` USDC，双边共 20 |
| 无 API Key 无法 Demo | Paper 模式用真实订单簿、模拟挂单 |

---

## 九、相关文档

- [product-research.md](./product-research.md) — 产品调研与三个 Idea 对比
- [hackathon-ideas.md](./hackathon-ideas.md) — 早期调研草稿
- [clob-client-v2](https://github.com/Polymarket/clob-client-v2) — Polymarket CLOB V2 SDK
- [Polymarket V2 Migration](https://docs.polymarket.com/v2-migration) — V2 迁移指南
