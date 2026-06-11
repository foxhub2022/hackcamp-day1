# Polymarket CLOB Client — 可借鉴的 3 个设计点

> 调研总结 · submodule: `polymarket-clob/` · 日期：2026-06-12  
> 关联：[顶层架构](./polymarket-clob-top-architecture.md) · [执行链路](./polymarket-clob-createAndPostOrder-trace.md) · [buildOrderSignature 依赖](./polymarket-clob-buildOrderSignature-deps.md)

---

## 设计点 1：双层鉴权 — L1 钱包签名换 L2 HMAC 会话

### 解决了什么问题

高频 CLOB 交易若每个 REST 请求都弹钱包 EIP-712，延迟与 UX 不可接受；但若完全不用链上身份，服务端无法确认「这个 API Key 属于哪个地址」。Polymarket 用 **一次性 L1 钱包签名** 创建/派生 API Key，之后 **L2 HMAC** 给每个受保护请求签名——链上身份与 API 凭证绑定，日常请求不再触达钱包。

### 怎么落地到新项目

1. 定义两套独立的 EIP-712 domain（本项目：`ClobAuthDomain` vs CTF Exchange Order domain），**不要混在一个 struct 里**。
2. L1 流程：`POST /auth/api-key` 携带 `POLY_ADDRESS` + `POLY_SIGNATURE`（钱包签 `{address, timestamp, nonce, message}`）。
3. L2 流程：服务端返回 `{ key, secret, passphrase }`；客户端对每个 mutating/query 请求计算  
   `HMAC-SHA256(secret, timestamp + method + path + body)`，写入 `POLY_*` 头。
4. Facade 构造函数分阶段：`new Client({ signer })` 仅 L1；`new Client({ signer, creds })` 开启 L2。

### 代码位置

| 层级 | 路径 | 关键符号 |
|------|------|----------|
| L1 EIP-712 | `polymarket-clob/src/signing/eip712.ts` | `buildClobEip712Signature` |
| L1 头组装 | `polymarket-clob/src/headers/index.ts` | `createL1Headers` |
| L2 HMAC | `polymarket-clob/src/signing/hmac.ts` | `buildPolyHmacSignature` |
| L2 头组装 | `polymarket-clob/src/headers/index.ts` | `createL2Headers` |
| Facade 门禁 | `polymarket-clob/src/client.ts` | `canL1Auth`, `canL2Auth` |
| 用法示例 | `polymarket-clob/README.md` L28–L33 | `createOrDeriveApiKey` → 带 `creds` 重建 client |

---

## 设计点 2：签名适配层 — 一个 `signTypedDataWithSigner` 统一 viem 与 ethers

### 解决了什么问题

Web3 项目里调用方可能用 viem `WalletClient`，也可能遗留 ethers `Signer`；若在 Order 签名、API Key 签名、HMAC 头生成等 **10+ 处** 各自判断 signer 类型，分支会爆炸且难以测试。本项目把「如何调钱包签 TypedData」收敛到 **单一函数 + 窄类型 `ClobSigner`**。

### 怎么落地到新项目

1. 定义 union type：`type AppSigner = EthersSigner | WalletClient`。
2. 用 duck typing 检测能力：`_signTypedData` vs `signTypedData`。
3. 导出唯一入口 `signTypedDataWithSigner({ signer, domain, types, value, primaryType })`；所有 EIP-712 场景（订单、鉴权、Permit2 等）只调这一处。
4. 单测 mock 一个 fake signer 即可覆盖全链路，不必启动真实钱包。

### 代码位置

| 层级 | 路径 | 关键符号 |
|------|------|----------|
| 适配层 | `polymarket-clob/src/signing/signer.ts` | `ClobSigner`, `signTypedDataWithSigner`, `getSignerAddress` |
| Order 签名消费 | `polymarket-clob/src/order-utils/exchangeOrderBuilderV2.ts` | `buildOrderSignature` → `signTypedDataWithSigner` |
| L1 鉴权消费 | `polymarket-clob/src/signing/eip712.ts` | `buildClobEip712Signature` |
| L2 地址解析 | `polymarket-clob/src/headers/index.ts` | `createL2Headers` → `getSignerAddress` |
| 单测 | `polymarket-clob/tests/signing/signer.test.ts` | viem / ethers 双路径 |

---

## 设计点 3：协议版本分层 — 业务算量 / 协议编码 / 传输 三者分离

### 解决了什么问题

Polymarket 同时存在 Exchange V1/V2/V3、NegRisk 变体、限价与市价、GTC/FOK 等多种组合。若全堆进 `client.ts`，任何 tick 舍入或 ABI 升级都会牵动 HTTP 层。本项目用 **三层职责** 隔离变化面：

- **算什么**：`order-builder/helpers/` — price/size → makerAmount/takerAmount、market 价格扫描  
- **签什么**：`order-utils/` — TypedData struct、EIP-712 domain、POLY_1271 特殊路径  
- **发什么**：`http-helpers/` + `headers/` — axios、重试、L2 头注入  

Facade 上的 `_retryOnVersionUpdate` 则在 **协议升级窗口** 自动重跑 create+post，避免用户手动刷新 Exchange version 缓存。

### 怎么落地到新项目

1. **helpers 层**只接受用户语义类型（`UserOrder`: price, size, side），输出链上 raw amounts。
2. **protocol 层**（类似 `ExchangeOrderBuilderV*`) 只接受已归一化的 `OrderData`，输出 `SignedOrder`；V1/V2/V3 用 class + `switch(version)` 或继承（V3 extends V2 只改 domain version）。
3. **transport 层**只接受 JSON-serializable payload + method/path，不关心 tick 或 struct。
4. 对「服务端协议可能热升级」的场景：在 Facade 包一层 `retryOnVersionMismatch`，检测特定 error code 后 `resolveVersion(true)` 并重试。

### 代码位置

| 层级 | 路径 | 关键符号 |
|------|------|----------|
| 业务算量 | `polymarket-clob/src/order-builder/helpers/getOrderRawAmounts.ts` | `getOrderRawAmounts` |
| 版本路由 | `polymarket-clob/src/order-builder/helpers/buildOrder.ts` | `buildOrder` → `buildOrderV1/V2/V3` |
| 协议编码 | `polymarket-clob/src/order-utils/exchangeOrderBuilderV2.ts` | `ExchangeOrderBuilderV2`, `ExchangeOrderBuilderV3` |
| 合约地址表 | `polymarket-clob/src/config.ts` | `getContractConfig` |
| REST 序列化 | `polymarket-clob/src/types/ordersV2.ts` | `orderToJsonV2` |
| HTTP 传输 | `polymarket-clob/src/http-helpers/index.ts` | `post`, `request`, `errorHandling` |
| 版本重试 | `polymarket-clob/src/client.ts` | `_retryOnVersionUpdate`, `resolveVersion`, `_isOrderVersionMismatch` |
| Facade 编排 | `polymarket-clob/src/client.ts` | `createAndPostOrder` |

---

## 使用建议

| 你的项目阶段 | 优先借鉴 |
|--------------|----------|
| 刚接 CLOB / 订单簿 API | 设计点 1（双层鉴权） |
| 需同时支持 viem + ethers 用户 | 设计点 2（签名适配层） |
| 协议多版本、多链、多合约变体 | 设计点 3（三层分离 + version retry） |

三者可独立采用；组合使用时顺序建议：**先 2（签名底座）→ 1（鉴权）→ 3（订单全链路）**。
