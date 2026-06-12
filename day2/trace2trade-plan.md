# Trace2Trade 实施计划

> 基于 [hackathon-ideas.md](./hackathon-ideas.md) Idea 1 · [trace2trade-concepts.md](./trace2trade-concepts.md)  
> 创建日期：2026-06-12  
> 状态：规划中

---

## 一、项目概述

**Trace2Trade** — 可验证 AI 推理 → 订单 metadata 归因 → Builder 分成 → Arc trace 存证。

跑通一条完整闭环：

```text
发现 Fed 利率市场 → 规则引擎推理 → metadata 指纹
  → Paper / Live 下单（带 builderCode）→ 本地 trace 存证 → verify 脚本对照
```

| 项 | 内容 |
|----|------|
| 代码目录 | `day2/trace2trade/` |
| 技术基座 | [@polymarket/client](https://github.com/Polymarket/ts-sdk)（npm `@beta`）+ viem 2.x |
| 首发垂直 | Fed 利率决议（流动性较好、Demo 好讲） |
| 默认模式 | Paper（无私钥可跑）；`MODE=live` + 私钥才真实下单 |
| 参考概念 | [trace2trade-concepts.md](./trace2trade-concepts.md) |

---

## 二、架构决策

| 决策 | 选择 | 理由 |
|------|------|------|
| SDK | `@polymarket/client@beta`（npm 安装） | 与 hackathon 调研一致；`ts-sdk/` 子模块仅作源码参考 |
| 推理引擎 | 规则引擎（midpoint + 订单簿深度） | `rules.md` 未批准 LLM API；MVP 先闭环，后续可换 LLM |
| 运行模式 | Paper 默认 | 符合仓库安全规范；无私钥也能 Demo |
| metadata | 本地扩展订单构造 | ts-sdk beta 在 `createUnsignedOrder` 里硬编码零值，需项目内注入 |
| Arc | 先做 stub + 本地 JSON | Arc CLI 需单独配置；Phase 2 再接 Circle 真实锚定 |
| 界面 | CLI + 结构化日志 | 两周 MVP 优先闭环，暂不做前端 |

---

## 三、目录结构

```text
day2/trace2trade/
├── package.json
├── tsconfig.json
├── .env.example
├── README.md
└── src/
    ├── index.ts                 # 主入口：跑一轮 Agent
    ├── config.ts                # 环境变量、Paper/Live 开关
    ├── reasoning/
    │   ├── schema.ts            # Reasoning 类型定义
    │   └── fingerprint.ts       # keccak256 → metadata 指纹
    ├── market/
    │   ├── discovery.ts         # 搜 Fed 相关市场
    │   └── orderbook.ts         # midpoint / 深度
    ├── pricing/
    │   └── fair-value.ts        # 规则引擎 fair value + 方向
    ├── order/
    │   └── place-with-trace.ts  # metadata + builderCode 下单封装
    ├── agent/
    │   └── engine.ts            # 主循环：推理 → 指纹 → 下单 → log
    ├── trace/
    │   ├── store.ts             # 本地 trace JSON 存储
    │   └── arc-stub.ts          # Arc 锚定接口（stub，后续接 Circle CLI）
    └── scripts/
        └── verify-trace.ts      # metadata hash 对照验证
```

---

## 四、任务清单（Todo）

| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| 1 | **脚手架** | `day2/trace2trade/` — package.json、tsconfig、.env.example、README | — |
| 2 | **配置层** | `config.ts` — Paper/Live、RPC、builderCode、SecureClient 初始化 | 1 |
| 3 | **推理模块** | `reasoning/` — 结构化 Reasoning JSON + keccak256 metadata 指纹 | 1 |
| 4 | **订单模块** | `order/` — metadata/builderCode 注入 + placeLimitOrder 封装 | 2, 3 |
| 5 | **市场发现** | `market/` — listMarkets/search + 订单簿 midpoint | 2 |
| 6 | **定价引擎** | `pricing/fair-value.ts` — 规则引擎 fair value | 5 |
| 7 | **Agent 主循环** | `agent/engine.ts` — 推理 → 指纹 → Paper/Live → audit log | 3–6 |
| 8 | **Arc trace** | `trace/` — 本地 JSON 存 trace + Arc stub | 3, 7 |
| 9 | **验证脚本** | `scripts/verify-trace.ts` — hash 三联对照 | 7, 8 |
| 10 | **Live 小单验证** | 主网/测试网小额下单 + listBuilderTrades 归因 | 4, 7（需私钥 + Builder 注册） |

---

## 五、时间表（14 天 MVP）

> 起点：**2026-06-12（Day 1）** · 终点：**2026-06-25（Day 14）**  
> 对齐 Agora 提交节奏：公开 GitHub + 3 分钟视频 + traction 说明。

### 总览

| 阶段 | 日期 | 天数 | 目标 |
|------|------|------|------|
| **Phase 1** 基础接入 | 6/12 – 6/14 | Day 1–3 | 脚手架 + ts-sdk 连通 + Paper 空跑 |
| **Phase 2** 核心闭环 | 6/15 – 6/18 | Day 4–7 | metadata 指纹 + 规则推理 + Paper 全链路 |
| **Phase 3** 存证与 Live | 6/19 – 6/22 | Day 8–11 | trace 存储 + Arc stub + Live 小单（可选） |
| **Phase 4** 交付打磨 | 6/23 – 6/25 | Day 12–14 | verify 脚本 + 视频 + traction 数据 |

---

### Phase 1 — 基础接入（Day 1–3）

| 日 | 日期 | 任务 | 验收标准 |
|----|------|------|----------|
| **Day 1** | 6/12（四） | Todo #1 脚手架；Todo #2 config + SecureClient 初始化 | `pnpm install` 成功；`createPublicClient` 能 `listMarkets` |
| **Day 2** | 6/13（五） | Todo #5 市场发现（Fed 关键词 search）；Todo #5 orderbook midpoint | CLI 输出目标市场 question + YES tokenId + midpoint |
| **Day 3** | 6/14（六） | Todo #3 推理 schema + fingerprint；Todo #6 fair-value 规则引擎 | 给定 midpoint 输出 Reasoning JSON + metadata hash |

**Phase 1 里程碑：** 无私钥可跑：`discover → price → reason → hash`，控制台打印结构化结果。

---

### Phase 2 — 核心闭环（Day 4–7）

| 日 | 日期 | 任务 | 验收标准 |
|----|------|------|----------|
| **Day 4** | 6/15（日） | Todo #4 订单模块：metadata 注入路径打通 | `createLimitOrder` 草稿含非零 metadata；EIP-712 payload 可 inspect |
| **Day 5** | 6/16（一） | Todo #7 Agent 主循环 Paper 模式 | 一轮完整：推理 → 指纹 → 模拟下单 → `data/runs/` audit log |
| **Day 6** | 6/17（二） | Paper 多轮 + Kelly 仓位上限（≤5% notional） | 连续 3 轮 run，log 含 runId / metadataHash / 模拟 price/size |
| **Day 7** | 6/18（三） | Builder Code 注册（若尚未完成）；`builderCode` 写入 Paper 订单草稿 | Paper 订单 JSON 含 builder 字段；文档记录注册步骤 |

**Phase 2 里程碑：** Paper 模式端到端闭环；audit log 可 JSON 解析；metadata ↔ reasoning 可本地 verify。

---

### Phase 3 — 存证与 Live（Day 8–11）

| 日 | 日期 | 任务 | 验收标准 |
|----|------|------|----------|
| **Day 8** | 6/19（四） | Todo #8 trace/store.ts 本地 JSON；run 目录规范 | 每次 run 生成 `{runId}.json` + `{runId}.meta.json` |
| **Day 9** | 6/20（五） | Todo #8 arc-stub.ts；三联对照 log 格式 | log 输出 Arc stub txId + metadataHash + 模拟 orderHash |
| **Day 10** | 6/21（六） | Todo #10 Live 小单（`MODE=live`，最小 size） | 真实 `placeLimitOrder` 成交或挂单；CLOB 响应可查 |
| **Day 11** | 6/22（日） | `listBuilderTrades` 归因验证；Arc CLI 调研/接入（若环境就绪） | Dashboard 级 CLI 输出：推理 ↔ 订单 ↔ builder trade 对照 |

**Phase 3 里程碑：** Live 至少 1 笔带 metadata + builderCode 的真实订单；trace 文件与链上/CLOB 数据可交叉验证。

---

### Phase 4 — 交付打磨（Day 12–14）

| 日 | 日期 | 任务 | 验收标准 |
|----|------|------|----------|
| **Day 12** | 6/23（一） | Todo #9 verify-trace.ts；README 使用说明 | `pnpm verify` 对任意 runId 输出 PASS/FAIL |
| **Day 13** | 6/24（二） | 3 分钟 Demo 视频脚本 + 录制（Loom/YouTube） | 视频覆盖：发现 → 推理 → 指纹 → 下单 → verify |
| **Day 14** | 6/25（三） | GitHub 公开；提交表单；traction 书面说明 | repo 可 clone 跑 Paper；表单填用户数 / 验证方式 |

**Phase 4 里程碑：** 可提交的 Hackathon 包：公开 repo + 视频 + 可复现 Paper 流程 + traction 说明。

---

## 六、环境变量（.env.example 预览）

```bash
# 运行模式：paper | live
MODE=paper

# Polygon RPC（viem）
POLYGON_RPC_URL=https://polygon-rpc.com

# Live 模式必填
POLYMARKET_PRIVATE_KEY=
POLYMARKET_DEPOSIT_WALLET=

# Builder 归因（Live 推荐）
BUILDER_CODE=

# Agent 参数
MARKET_QUERY=fed rate cut
MAX_ORDER_SIZE_USDC=10
KELLY_CAP=0.05

# Trace 存储
TRACE_DIR=./data/runs
```

---

## 七、风险与缓冲

| 风险 | 缓冲安排 | 对应日程 |
|------|----------|----------|
| ts-sdk metadata 无法直接传入 | Day 4 专门攻克本地 order 构造 | Day 4 有 1 天 buffer |
| Builder Code 注册延迟 | Paper 模式不阻塞；Live 推到 Day 10 | Phase 2 末注册，Phase 3 验证 |
| Arc CLI 环境未就绪 | stub 已覆盖 Demo；真实锚定为加分项 | Day 11 可选，不挡提交 |
| Fed 市场流动性/匹配失败 | 备选 market query：`FOMC` / `interest rate` | Day 2 多 query fallback |
| 无 LLM | 规则引擎已决策；Phase 4 前不依赖外部 API | 全周期 |

**建议缓冲日：** Day 7（Phase 2 末）和 Day 11（Phase 3 末）各留半天处理阻塞项；Day 14 上午只做提交，下午不排新功能。

---

## 八、交付物清单

| 交付物 | 截止 | 说明 |
|--------|------|------|
| 可运行 repo `day2/trace2trade/` | Day 12 | `pnpm start` Paper 闭环 |
| verify-trace 脚本 | Day 12 | 评委/用户可自证 hash |
| Live 小单记录（可选） | Day 11 | listBuilderTrades 截图或 CLI 输出 |
| 3 分钟视频 | Day 13 | 推理-订单-验证三联演示 |
| traction 说明 | Day 14 | 表单：多少用户跑过 verify / Paper |

---

## 九、参考资料

- [hackathon-ideas.md](./hackathon-ideas.md) — Idea 1 方案与 MVP 路径
- [trace2trade-concepts.md](./trace2trade-concepts.md) — metadata / builder / Arc 概念详解
- [Agora Agents Hackathon](https://agora.thecanteenapp.com/) — 评审维度与提交要求
- [Polymarket/ts-sdk](https://github.com/Polymarket/ts-sdk) — 官方 SDK
- [ts-sdk-research.md](../day1-onchain-hello/spec/ts-sdk-origin-doc/ts-sdk-research.md) — 本地 SDK 调研
