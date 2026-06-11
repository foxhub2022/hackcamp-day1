# HACKCAMP 项目开发规范

> 本文件为仓库级开发依据，适用于所有 Day 子项目。  
> 当前主线：**Day 2 — LiquidityForge**（详见 `day2/liquidityforge-plan.md`）

---

## 1. 项目上下文

### 1.1 仓库结构

```
HACKCAMP/
├── day1-onchain-hello/     # Day 1：viem 链上基础（余额查询等）
├── day2/
│   ├── product-research.md # 产品调研
│   ├── liquidityforge-plan.md
│   └── liquidityforge/     # Day 2 主线：Polymarket 做市 Agent
└── README.MD
```

每个 Day 是**独立可运行**的子项目，拥有自己的 `package.json` 与 `src/`。

### 1.2 当前主线目标（LiquidityForge）

在 Polymarket 长尾宏观垂直市场（首发：**Fed 利率决议**）提供被动流动性：

```
宏观日历 → Gamma 搜市场 → 读订单簿 → Fair Value + spread
    → 双边 GTC 挂单（Paper / Live）→ 监听 → 动态调整
```

产品定位与竞品边界见 `day2/product-research.md`。

---

## 2. 技术栈（必须遵守）

| 类别 | 要求 |
|------|------|
| 语言 | TypeScript，`strict: true` |
| 运行时 | Node.js >= v20 LTS（推荐 v22 / v24） |
| 执行 | `tsx` 直接运行 `.ts`，不先编译到 `dist/` |
| 链上交互 | **viem 2.x**（禁止 ethers.js v5/v6） |
| 预测市场 | **@polymarket/clob-client-v2**（CLOB V2，禁止 V1 `clob-client`） |
| 环境变量 | **dotenv**，敏感信息只放 `.env`，提交 `.env.example` |
| HTTP | 内置 `fetch`，禁止 axios / node-fetch |
| 测试 | MVP 阶段不写单元测试，Paper 模式即验证手段 |

### 2.1 已批准的外部 API

以下 API 可直接集成，无需额外请示：

| API | 用途 | 端点 |
|-----|------|------|
| Polymarket Gamma | 市场发现、元数据 | `https://gamma-api.polymarket.com` |
| Polymarket CLOB V2 | 订单簿、下单、撤单 | `https://clob.polymarket.com` |
| 以太坊 / Polygon RPC | 链上读写在 viem 中完成 | 通过 viem `http()` transport |

引入**未列出的**第三方 API（LLM、新闻源、其他交易所等）须先请示。

### 2.2 SDK 使用约定

```ts
// CLOB 客户端：options 构造，chain 非 chainId
import { Chain, ClobClient, OrderType, Side } from "@polymarket/clob-client-v2";

// L1 签名 derive API Key → L2 HMAC 下单
const client = new ClobClient({ host, chain: Chain.POLYGON, signer, creds });

// 限价单 GTC；做市优先 GTC，避免 FOK 吃单
await client.createAndPostOrder({ tokenID, price, side, size }, { tickSize }, OrderType.GTC);
```

V2 订单字段：使用 `timestamp`、`metadata`、`builder`；**禁止** `nonce`、`feeRateBps`、`taker`。

---

## 3. 目录约定

### 3.1 通用结构（每个 Day 子项目）

```
dayN/<project-name>/
├── package.json
├── tsconfig.json
├── .env.example          # 提交；.env 不入库
├── README.md
├── spec/
│   ├── rules.md          # 本文件（仓库级规范）
│   └── logs/             # 变更日志（见 §7）
└── src/
    ├── index.ts          # 主入口
    ├── config.ts         # 环境变量与常量
    ├── lib/              # 通用工具（RPC client、formatters）
    ├── scripts/          # 可独立执行的脚本
    └── <domain>/         # 按业务域分子目录（见 LiquidityForge 示例）
```

### 3.2 LiquidityForge 域目录（Day 2 参考）

```
src/
├── calendar/macro-events.ts   # 宏观事件日历
├── market/
│   ├── gamma.ts               # Gamma API 市场发现
│   └── orderbook.ts           # 订单簿 + midpoint
├── pricing/fair-value.ts      # 公允价 + spread
└── maker/
    ├── engine.ts              # 做市核心
    ├── paper.ts               # Paper 模拟
    └── live.ts                # Live 实盘
```

新模块按**业务域**建子目录，不要把所有逻辑堆在 `index.ts`。

---

## 4. 运行模式与安全

### 4.1 Paper / Live 双模式（强制）

| 模式 | 默认值 | 行为 |
|------|--------|------|
| `paper` | ✅ 是 | 读真实订单簿，**模拟**挂单与成交；无需私钥 |
| `live` | 否 | 通过 clob-client-v2 **真实下单**；须配置私钥 |

- `MODE` 环境变量控制，未设置时**必须为 paper**
- Live 模式须显式设置 `MODE=live` + `PRIVATE_KEY`
- Live 单笔默认上限 `ORDER_SIZE=10` USDC，双边共 20；调大须请示

### 4.2 环境变量规范

| 变量 | Paper | Live | 说明 |
|------|-------|------|------|
| `MODE` | 可选 | 必填 `live` | `paper`（默认）或 `live` |
| `PRIVATE_KEY` | 不需要 | 必填 | Polygon 钱包私钥 |
| `CLOB_API_KEY` | 不需要 | 可选 | 可运行时 `createOrDeriveApiKey()` |
| `CLOB_SECRET` | 不需要 | 可选 | 同上 |
| `CLOB_PASS_PHRASE` | 不需要 | 可选 | 同上 |
| `CLOB_HOST` | 可选 | 可选 | 默认 `https://clob.polymarket.com` |
| `ORDER_SIZE` | 可选 | 可选 | 单边挂单量（USDC），默认 `10` |
| `BASE_SPREAD` | 可选 | 可选 | 基础 spread（美分），默认 `4` |

`.env.example` 必须包含以上全部变量及注释；**禁止**将 `.env` 提交到 git。

### 4.3 主网 / 真实资产操作

以下操作**必须先请示**：

- 切换 `MODE=live` 并在主网下单
- 调大 `ORDER_SIZE` 超过默认值
- 引入新的链（非 Polygon）或新的抵押品操作（pUSD wrap 等）
- 任何涉及用户资金的合约部署

---

## 5. 代码风格

- **命名**：函数 `camelCase`，常量 `SCREAMING_SNAKE_CASE`，类型/接口 `PascalCase`
- **注释**：不写「做了什么」，只写「为什么这么做」
- **错误处理**：所有外部 IO（RPC、Gamma、CLOB）必须 `try/catch`，错误信息对人类可读
- **输出**：控制台结构化、友好；禁止直接 `console.log` 原始 JSON 响应
- **依赖**：优先复用已有模块；不引入与 viem / clob-client-v2 重叠的库
- **范围**：最小化 diff，不改无关文件

### 5.1 Agent 日志格式（LiquidityForge）

每轮做市循环至少输出：

```
[时间] [模式] 事件=<宏观事件> 市场=<question> fairValue=<价> spread=<价>
  bid=<价>@<量>  ask=<价>@<量>  action=<挂单|撤单|跳过>
```

---

## 6. 架构原则

| 原则 | 说明 |
|------|------|
| MVP 优先闭环 | 先 Paper 跑通「发现市场 → 定价 → 模拟做市」，再开 Live |
| 规则引擎先行 | Fair Value 先用 midpoint + 临近度 + 深度，LLM 为 Phase 2 增强 |
| CLI 优先 | 两周内不做前端；结构化日志即 Demo 界面 |
| 降级策略 | 长尾市场无合约 → 输出「市场匹配建议」，不强行下单 |
| V2 原生能力 | 优先用 `negRisk`、`metadata`、`builderCode` 等 V2 primitive |

### 6.1 风险应对（内置）

| 风险 | 默认应对 |
|------|----------|
| 逆向选择 | Paper 验证 spread；Live 限制单笔上限 |
| 流动性不足 | 自动 widen spread 或跳过该市场 |
| 资本占用 | 默认小单；不双边重仓同一薄市场 |
| 无 API Key | Paper 模式必须可无凭证完整 Demo |

---

## 7. 自主决策边界

### 7.1 可自主执行

- 安装 / 升级依赖（viem、clob-client-v2、tsx、dotenv）
- 重构内部函数、拆分模块
- 添加错误处理、日志、Paper 模式逻辑
- 修改控制台输出格式
- 在 `spec/logs/` 写 changelog
- 使用已批准 API（Gamma、CLOB V2、RPC）

### 7.2 必须先请示

- 引入新的第三方 API（LLM、新闻、Kalshi 等）
- 切换 Live 模式或主网真实下单
- 改变 `package.json` 的 `scripts` 命名
- 部署智能合约或涉及用户托管资金
- 调大默认 `ORDER_SIZE` / `BASE_SPREAD` 阈值

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

- 实施计划变更 → 更新 `day2/liquidityforge-plan.md` 对应章节
- Todo 完成 → 更新 plan 中状态列
- 新 env 变量 → 同步 `.env.example` 与本文件 §4.2

---

## 9. MVP 里程碑（LiquidityForge）

| 阶段 | 天数 | 交付物 |
|------|------|--------|
| Phase 1 | Day 1–3 | 脚手架 + Gamma 搜市场 + 读订单簿（Paper） |
| Phase 2 | Day 4–7 | Fair Value + 双边 GTC + 动态 spread |
| Phase 3 | Day 8–10 | Agent 主循环 + 宏观日历 + 结构化日志 |
| Phase 4 | Day 11–14 | Live 小额验证 + README + 视频 Demo |

---

## 10. 参考文档

| 文档 | 路径 / 链接 |
|------|-------------|
| 产品调研 | `day2/product-research.md` |
| LiquidityForge 计划 | `day2/liquidityforge-plan.md` |
| clob-client-v2 | https://github.com/Polymarket/clob-client-v2 |
| V2 迁移指南 | https://docs.polymarket.com/v2-migration |
| Day 1 示例 | `day1-onchain-hello/src/index.ts` |
