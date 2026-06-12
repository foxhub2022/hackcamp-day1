# HACKCAMP 项目开发规范

> 本文件为仓库级开发依据，适用于所有 Day 子项目。  
> 当前主线：**Day 2 — Trace2Trade**（详见 `day2/trace2trade-plan.md`）

---

## 1. 项目上下文

### 1.1 仓库结构

```
HACKCAMP/
├── day1-onchain-hello/     # Day 1：viem 链上基础（余额查询等）
├── day2/
│   ├── hackathon-ideas.md      # Hackathon 方案调研
│   ├── trace2trade-concepts.md # metadata / builder / Arc 概念
│   ├── trace2trade-plan.md     # Trace2Trade 实施计划与时间表
│   ├── product-research.md     # 早期产品调研（参考）
│   └── trace2trade/            # Day 2 主线：可验证推理 → 归因下单 Agent
├── ts-sdk/                 # Polymarket 官方 SDK 子模块（只读参考）
└── README.MD
```

每个 Day 是**独立可运行**的子项目，拥有自己的 `package.json` 与 `src/`。

### 1.2 当前主线目标（Trace2Trade）

在 Polymarket Fed 利率垂直市场跑通「推理 → 指纹 → 下单 → 存证 → 验证」闭环：

```
发现 Fed 市场 → 规则引擎推理 → metadata 指纹（keccak256）
    → Paper / Live 下单（builderCode）→ 本地 trace 存证 → verify 脚本对照
```

产品定位与概念详解见 `day2/trace2trade-concepts.md`；竞品边界见 `day2/hackathon-ideas.md`。

---

## 2. 技术栈（必须遵守）

| 类别 | 要求 |
|------|------|
| 语言 | TypeScript，`strict: true` |
| 运行时 | Node.js >= v20 LTS（推荐 v22 / v24） |
| 执行 | `tsx` 直接运行 `.ts`，不先编译到 `dist/` |
| 链上交互 | **viem 2.x**（禁止 ethers.js v5/v6） |
| 预测市场 | **@polymarket/client@beta**（官方 ts-sdk；禁止 V1 `clob-client`；旧 `clob-client-v2` 已归档） |
| 环境变量 | **dotenv**，敏感信息只放 `.env`，提交 `.env.example` |
| HTTP | 内置 `fetch`，禁止 axios / node-fetch |
| 测试 | MVP 阶段不写单元测试，Paper 模式 + verify 脚本即验证手段 |

> `ts-sdk/` 子模块供源码对照；**运行时依赖通过 npm 安装 `@polymarket/client@beta`**，见 `spec/submodules.md`。

### 2.1 已批准的外部 API

以下 API 可直接集成，无需额外请示：

| API | 用途 | 端点 |
|-----|------|------|
| Polymarket Gamma | 市场发现、元数据 | `https://gamma-api.polymarket.com`（经 SDK 统一暴露） |
| Polymarket CLOB V2 | 订单簿、下单、撤单、Builder 归因 | `https://clob.polymarket.com`（经 SDK 统一暴露） |
| 以太坊 / Polygon RPC | 链上读写在 viem 中完成 | 通过 viem `http()` transport |

引入**未列出的**第三方 API（LLM、新闻源、Kalshi、Arc 主网等）须先请示。

### 2.2 SDK 使用约定

```ts
import { createPublicClient, createSecureClient, OrderSide } from '@polymarket/client';
import { privateKey } from '@polymarket/client/viem';

// 只读：市场发现、订单簿
const publicClient = createPublicClient();

// Live：L1 签名 derive API Key → L2 HMAC 下单
const secureClient = await createSecureClient({
  wallet: process.env.POLYMARKET_DEPOSIT_WALLET!,
  signer: privateKey(process.env.POLYMARKET_PRIVATE_KEY!),
});

// 限价单 GTC；带 builder 归因
await secureClient.placeLimitOrder({
  tokenId,
  price,
  size,
  side: OrderSide.BUY,
  builderCode, // 可选；Live 推荐
});
```

V2 订单字段：使用 `timestamp`、`metadata`、`builder`；**禁止** V1 字段 `nonce`、`feeRateBps`、`taker`。

**metadata 注意：** ts-sdk beta 在 `createUnsignedOrder` 内默认填零；Trace2Trade 须在 `order/` 模块本地扩展注入推理指纹（见 `day2/trace2trade-plan.md` §二）。

---

## 3. 目录约定

### 3.1 通用结构（每个 Day 子项目）

```
dayN/<project-name>/
├── package.json
├── tsconfig.json
├── .env.example          # 提交；.env 不入库
├── README.md
└── src/
    ├── index.ts          # 主入口
    ├── config.ts         # 环境变量与常量
    ├── lib/              # 通用工具（RPC client、formatters）
    ├── scripts/          # 可独立执行的脚本
    └── <domain>/         # 按业务域分子目录（见 Trace2Trade 示例）
```

### 3.2 Trace2Trade 域目录（Day 2 参考）

```
src/
├── reasoning/
│   ├── schema.ts            # Reasoning 类型
│   └── fingerprint.ts       # keccak256 → metadata
├── market/
│   ├── discovery.ts         # Fed 市场发现
│   └── orderbook.ts         # midpoint / 深度
├── pricing/
│   └── fair-value.ts        # 规则引擎 fair value
├── order/
│   └── place-with-trace.ts  # metadata + builderCode 下单
├── agent/
│   └── engine.ts            # 主循环
├── trace/
│   ├── store.ts             # 本地 trace JSON
│   └── arc-stub.ts          # Arc 锚定 stub
└── scripts/
    └── verify-trace.ts      # hash 三联对照
```

新模块按**业务域**建子目录，不要把所有逻辑堆在 `index.ts`。

---

## 4. 运行模式与安全

### 4.1 Paper / Live 双模式（强制）

| 模式 | 默认值 | 行为 |
|------|--------|------|
| `paper` | ✅ 是 | 读真实订单簿与推理；**模拟**下单与 trace；无需私钥 |
| `live` | 否 | 通过 `@polymarket/client` **真实下单**；须配置私钥 + Deposit Wallet |

- `MODE` 环境变量控制，未设置时**必须为 paper**
- Live 模式须显式设置 `MODE=live` + `POLYMARKET_PRIVATE_KEY` + `POLYMARKET_DEPOSIT_WALLET`
- Live 单笔默认上限 `MAX_ORDER_SIZE_USDC=10`；调大须请示

### 4.2 环境变量规范

| 变量 | Paper | Live | 说明 |
|------|-------|------|------|
| `MODE` | 可选 | 必填 `live` | `paper`（默认）或 `live` |
| `POLYGON_RPC_URL` | 可选 | 推荐 | Polygon RPC；viem transport |
| `POLYMARKET_PRIVATE_KEY` | 不需要 | 必填 | 签名私钥 |
| `POLYMARKET_DEPOSIT_WALLET` | 不需要 | 必填 | Deposit Wallet 地址 |
| `BUILDER_CODE` | 可选 | 推荐 | Builder 归因码；Live 分成必需 |
| `MARKET_QUERY` | 可选 | 可选 | 市场搜索关键词，默认 `fed rate cut` |
| `MAX_ORDER_SIZE_USDC` | 可选 | 可选 | 单笔上限（USDC），默认 `10` |
| `KELLY_CAP` | 可选 | 可选 | Kelly 仓位上限比例，默认 `0.05` |
| `TRACE_DIR` | 可选 | 可选 | trace 存储目录，默认 `./data/runs` |

`.env.example` 必须包含以上全部变量及注释；**禁止**将 `.env` 提交到 git。

### 4.3 主网 / 真实资产操作

以下操作**必须先请示**：

- 切换 `MODE=live` 并在主网下单
- 调大 `MAX_ORDER_SIZE_USDC` 超过默认值
- 引入新的链（非 Polygon）或新的抵押品操作
- Arc 主网真实锚定（stub 阶段无需请示）
- 任何涉及用户资金的合约部署

---

## 5. 代码风格

- **命名**：函数 `camelCase`，常量 `SCREAMING_SNAKE_CASE`，类型/接口 `PascalCase`
- **注释**：不写「做了什么」，只写「为什么这么做」
- **错误处理**：所有外部 IO（RPC、SDK、trace 存储）必须 `try/catch`，错误信息对人类可读
- **输出**：控制台结构化、友好；禁止直接 `console.log` 原始 JSON 响应
- **依赖**：优先复用已有模块；不引入与 viem / `@polymarket/client` 重叠的库
- **范围**：最小化 diff，不改无关文件

### 5.1 Agent 日志格式（Trace2Trade）

每轮 Agent 循环至少输出：

```
[时间] [模式] runId=<id> 市场=<question> fairValue=<价> direction=<YES|NO>
  metadataHash=<0x...>  price=<价> size=<量>  action=<paper|live|skip>
  tracePath=<path>  arcStubTxId=<id|pending>
```

---

## 6. 架构原则

| 原则 | 说明 |
|------|------|
| MVP 优先闭环 | 先 Paper 跑通「发现 → 推理 → 指纹 → 模拟下单 → verify」，再开 Live |
| 规则引擎先行 | Fair Value 先用 midpoint + 深度；LLM 为 Phase 2 增强（须请示） |
| CLI 优先 | 两周内不做前端；结构化日志 + verify 脚本即 Demo 界面 |
| V2 原生能力 | 优先用 `metadata`、`builderCode`；Arc trace 先 stub 后实接 |
| 可验证性 | 每笔 run 必须可经 `verify-trace` 对照 metadataHash ↔ Reasoning JSON |
| 降级策略 | 市场匹配失败 → 备选 query（`FOMC` / `interest rate`）；不强行下单 |

### 6.1 风险应对（内置）

| 风险 | 默认应对 |
|------|----------|
| ts-sdk metadata 默认零值 | `order/` 本地扩展注入；Day 4 专项攻克 |
| Builder 注册延迟 | Paper 不阻塞；Live 推到 Phase 3 |
| Arc CLI 未就绪 | stub + 本地 JSON 覆盖 Demo |
| 推理与 PnL 背离 | verify 脚本 + audit log 公开；Kelly cap ≤ 5% |
| 无 API Key / 无私钥 | Paper 模式必须可无凭证完整 Demo |

---

## 7. 自主决策边界

### 7.1 可自主执行

- 安装 / 升级依赖（viem、`@polymarket/client`、tsx、dotenv）
- 重构内部函数、拆分模块
- 添加错误处理、日志、Paper 模式逻辑
- 修改控制台输出格式
- 在 `spec/logs/` 写 changelog
- 使用已批准 API（Gamma、CLOB V2、RPC，经 SDK 调用）
- Arc trace **stub** 实现（本地 JSON + 模拟 txId）

### 7.2 必须先请示

- 引入新的第三方 API（LLM、新闻、Kalshi、Arc 主网 CLI 等）
- 切换 Live 模式或主网真实下单
- 改变 `package.json` 的 `scripts` 命名
- 部署智能合约或涉及用户托管资金
- 调大默认 `MAX_ORDER_SIZE_USDC` / `KELLY_CAP` 阈值

---

## 8. 产出要求

### 8.1 每次多文件改动

在 `spec/logs/` 下追加简短 changelog，格式：

```
## YYYY-MM-DD — <一句话摘要>
- 改了什么
- 为什么改
```

（Day 2 子项目若无 `spec/logs/`，可在该项目根目录 `CHANGELOG.md` 追加。）

### 8.2 命令执行

跑终端命令前，先说明要跑什么、预期结果。

### 8.3 文档同步

- 实施计划变更 → 更新 `day2/trace2trade-plan.md` 对应章节
- Todo 完成 → 更新 plan 中状态列
- 新 env 变量 → 同步 `.env.example` 与本文件 §4.2
- 仓库级规范变更 → 更新本文件

---

## 9. MVP 里程碑（Trace2Trade）

> 详细日程见 `day2/trace2trade-plan.md` §五。起点 2026-06-12，终点 2026-06-25。

| 阶段 | 日期 | 天数 | 交付物 |
|------|------|------|--------|
| **Phase 1** 基础接入 | 6/12 – 6/14 | Day 1–3 | 脚手架 + ts-sdk 连通 + discover → reason → hash |
| **Phase 2** 核心闭环 | 6/15 – 6/18 | Day 4–7 | metadata 注入 + Paper 全链路 + builderCode 草稿 |
| **Phase 3** 存证与 Live | 6/19 – 6/22 | Day 8–11 | trace 存储 + Arc stub + Live 小单 + listBuilderTrades |
| **Phase 4** 交付打磨 | 6/23 – 6/25 | Day 12–14 | verify-trace + README + 3 分钟视频 + traction 说明 |

**Phase 验收摘要：**

| Phase | 里程碑 |
|-------|--------|
| 1 | 无私钥可跑：discover → price → reason → hash |
| 2 | Paper 端到端；metadata ↔ reasoning 可本地 verify |
| 3 | Live ≥1 笔带 metadata + builderCode；trace 可交叉验证 |
| 4 | 可提交 Hackathon 包：repo + 视频 + 可复现 Paper |

---

## 10. 参考文档

| 文档 | 路径 / 链接 |
|------|-------------|
| Hackathon 方案 | `day2/hackathon-ideas.md` |
| Trace2Trade 概念 | `day2/trace2trade-concepts.md` |
| Trace2Trade 计划 | `day2/trace2trade-plan.md` |
| 产品调研（早期） | `day2/product-research.md` |
| ts-sdk 子模块说明 | `spec/submodules.md` |
| ts-sdk 本地调研 | `spec/ts-sdk-origin-doc/ts-sdk-research.md` |
| Polymarket/ts-sdk | https://github.com/Polymarket/ts-sdk |
| Agora Hackathon | https://agora.thecanteenapp.com/ |
| Day 1 示例 | `day1-onchain-hello/src/index.ts` |
