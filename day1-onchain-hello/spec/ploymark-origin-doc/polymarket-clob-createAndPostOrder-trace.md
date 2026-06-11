# 执行链路：`createAndPostOrder`（GTC 限价单）

> submodule: `polymarket-clob/` · 动作：用户提交 `{ tokenID, price, side, size }` 并挂单  
> 说明：模板中的 `[X]` 未指定；本文追踪 README / examples 中最核心的限价下单路径。  
> **本 SDK 在此链路内不发链上交易**——订单经 EIP-712 离线签名后 POST 到 Polymarket CLOB 服务端；链上结算发生在后续撮合阶段，不在此调用栈内。

---

## 主路径（Happy Path）

1. 用户脚本构造订单参数并调用公开 API  
   → `examples/orders/gtcLimitBuy.ts`: `main`  
   → `polymarket-clob/src/client.ts`: `ClobClient.createAndPostOrder`  
   *(async · 同进程)*

2. 版本不匹配时自动重试包装（最多 2 次）  
   → `polymarket-clob/src/client.ts`: `ClobClient._retryOnVersionUpdate`  
   → 内部先 `resolveVersion()` 缓存 Exchange 版本  
   *(async · 同进程)*

3. 构建已签名订单（Phase A：本地计算 + 链下签名）  
   → `polymarket-clob/src/client.ts`: `ClobClient.createOrder`  
   *(async · 同进程)*

4. 校验 L1 能力（必须有 wallet signer）  
   → `polymarket-clob/src/client.ts`: `ClobClient.canL1Auth`  
   *(sync · 同进程)*

5. 解析市场 tick size（可能触发 REST）  
   → `polymarket-clob/src/client.ts`: `ClobClient._resolveTickSize`  
   → `polymarket-clob/src/client.ts`: `ClobClient.getTickSize`  
   → `polymarket-clob/src/client.ts`: `ClobClient.get`  
   → `polymarket-clob/src/http-helpers/index.ts`: `get` → `request`  
   → **Polymarket CLOB** `GET {host}/tick-size?token_id=…`  
   *(async · **跨进程 HTTP** · 结果写入 `ClobClient.tickSizes` 内存缓存)*

6. 校验并舍入价格  
   → `polymarket-clob/src/utilities.ts`: `priceValid`  
   → `polymarket-clob/src/utilities.ts`: `roundNormal`  
   *(sync · 同进程)*

7. 解析 Exchange 版本（可能触发 REST）  
   → `polymarket-clob/src/client.ts`: `ClobClient.resolveVersion`  
   → `polymarket-clob/src/client.ts`: `ClobClient.getVersion`  
   → **Polymarket CLOB** `GET {host}/version`  
   *(async · **跨进程 HTTP** · 结果写入 `ClobClient.cachedVersion` 内存缓存)*

8. 解析 negRisk 标志（可能触发 REST）  
   → `polymarket-clob/src/client.ts`: `ClobClient.getNegRisk`  
   → **Polymarket CLOB** `GET {host}/neg-risk?token_id=…`  
   *(async · **跨进程 HTTP** · 结果写入 `ClobClient.negRisk` 内存缓存)*

9. 委托 OrderBuilder 构建签名订单  
   → `polymarket-clob/src/order-builder/orderBuilder.ts`: `OrderBuilder.buildOrder`  
   → `polymarket-clob/src/order-builder/orderBuilder.ts`: `OrderBuilder.resolveSigner`  
   → `polymarket-clob/src/order-builder/helpers/createOrder.ts`: `createOrder`  
   *(async · 同进程)*

10. 读取链上合约地址（纯本地配置，无 RPC）  
    → `polymarket-clob/src/config.ts`: `getContractConfig`  
    → 按 `version` + `negRisk` 选择 `exchangeV2` / `negRiskExchangeV2` / `exchangeV3` 等  
    *(sync · 同进程 · 读内存常量)*

11. 用户语义 → 链上 raw amounts  
    → `polymarket-clob/src/order-builder/helpers/buildOrderCreationArgs.ts`: `buildOrderCreationArgs`  
    → `polymarket-clob/src/order-builder/helpers/getOrderRawAmounts.ts`: `getOrderRawAmounts`  
    → `viem`: `parseUnits`  
    *(sync · 同进程)*

12. 组装 Order 结构并 EIP-712 签名（**链下**，非链上 tx）  
    → `polymarket-clob/src/order-builder/helpers/buildOrder.ts`: `buildOrder` → `buildOrderV2`（默认 v2）  
    → `polymarket-clob/src/order-utils/exchangeOrderBuilderV2.ts`: `ExchangeOrderBuilderV2.buildSignedOrder`  
    → `ExchangeOrderBuilderV2.buildOrder` → `buildOrderTypedData` → `buildOrderSignature`  
    → `polymarket-clob/src/signing/signer.ts`: `signTypedDataWithSigner`  
    → **钱包 / viem WalletClient**：`signTypedData`（domain = CTF Exchange 合约 + chainId）  
    *(async · 同进程 · 密码学签名；可能弹钱包 UI)*

13. 提交订单到 CLOB（Phase B：REST + L2 鉴权）  
    → `polymarket-clob/src/client.ts`: `ClobClient.postOrder`  
    *(async · 同进程)*

14. 校验 L2 能力（signer + API creds）  
    → `polymarket-clob/src/client.ts`: `ClobClient.canL2Auth`  
    *(sync · 同进程)*

15. SignedOrder → REST JSON body  
    → `polymarket-clob/src/types/ordersV2.ts`: `orderToJsonV2`  
    *(sync · 同进程)*

16. 生成 L2 HMAC 请求头  
    → `polymarket-clob/src/headers/index.ts`: `createL2Headers`  
    → `polymarket-clob/src/signing/hmac.ts`: `buildPolyHmacSignature`  
    → `globalThis.crypto.subtle.sign`（HMAC-SHA256）  
    *(async · 同进程 · 本地 crypto)*

17. 可选：与服务器时间对齐（`useServerTime=true` 时）  
    → `polymarket-clob/src/client.ts`: `ClobClient.getServerTime`  
    → **Polymarket CLOB** `GET {host}/time`  
    *(async · **跨进程 HTTP**)*

18. 发送 POST 请求  
    → `polymarket-clob/src/client.ts`: `ClobClient.post`  
    → `polymarket-clob/src/http-helpers/index.ts`: `post` → `request`  
    → **axios** `POST {host}/order` + `POLY_*` headers + JSON body  
    *(async · **跨进程 HTTP**)*

19. **最底层持久化（SDK 可见边界）**  
    → **Polymarket CLOB 服务端** 接收 `POST /order`，校验签名与余额后 **写入其订单簿 / 数据库**  
    *(async · **跨进程 · 服务端黑盒** · SDK 源码不可见)*

20. 响应回传用户  
    → `polymarket-clob/src/client.ts`: `ClobClient.throwIfError`  
    → 返回 `{ orderID, … }` 或等价 JSON 给 `createAndPostOrder` 调用方  
    *(sync · 同进程)*

---

## 异常分支

### A. 鉴权前置失败（createOrder / postOrder 入口）

| 条件 | 跳数 | 行为 |
|------|------|------|
| 未注入 `signer` | `canL1Auth` / `canL2Auth` | 抛出 `L1_AUTH_UNAVAILABLE_ERROR`（`polymarket-clob/src/errors.ts`） |
| 未注入 `creds` | `canL2Auth`（postOrder） | 抛出 `L2_AUTH_NOT_AVAILABLE` |

### B. 参数 / 市场元数据校验失败（createOrder 内）

| 条件 | 跳数 | 行为 |
|------|------|------|
| `price` 超出 tick 合法区间 | `priceValid` | `throw new Error("invalid price …")` |
| 用户 tickSize 小于市场最小 tick | `_resolveTickSize` | `throw new Error("invalid tick size …")` |
| v1 订单 feeRateBps 与市场不符 | `_resolveFeeRateBps` | `throw new Error("invalid user provided fee rate …")` |
| signer 地址与 order.signer 不一致 | `ExchangeOrderBuilderV2.buildOrder` | `throw new Error("signer does not match")` |
| 不支持的 Exchange version | `createOrder` / `buildOrder` | `throw new Error("unsupported order version …")` |

### C. HTTP / 网络层（postOrder → post）

| 条件 | 跳数 | 行为 |
|------|------|------|
| axios 网络错误或 4xx/5xx | `http-helpers/index.ts`: `errorHandling` | 返回 `{ error, status }` 对象（不 throw） |
| `retryOnError=true` 且瞬态 5xx/网络错误 | `post` | sleep 30ms 后 **重试一次** `request` |
| 重试仍失败 | `errorHandling` | 同上，返回 error 对象 |
| `throwOnError=true`（默认）且响应含 `error` | `throwIfError` | 抛出 `ApiError` |
| 响应含 `ORDER_VERSION_MISMATCH` | `postOrder` → `_isOrderVersionMismatch` → `resolveVersion(true)` | 强制刷新版本缓存；外层 `_retryOnVersionUpdate` 可能再跑一整轮 create+post |

### D. postOrder 组合约束

| 条件 | 跳数 | 行为 |
|------|------|------|
| `postOnly=true` 且 `orderType` 为 FOK/FAK | `postOrder` 入口 | `throw new Error("postOnly is not supported for FOK/FAK orders")` |

---

## 链路边界说明

| 层级 | 是否在本链路发生 | 说明 |
|------|------------------|------|
| 本地文件系统 | ❌ | SDK 不读写磁盘；`.env` 由用户脚本自行加载 |
| 链上合约写入 | ❌ | 本调用只产生 **EIP-712 离线签名**；`config.ts` 中的 Exchange 地址仅用于 TypedData domain |
| Polymarket 服务端 DB | ✅ | `POST /order` 的最终落点；订单进入 CLOB 订单簿 |
| 链上结算 | ❌（不在此栈） | 撮合成交后由 Polymarket 基础设施另行上链 |

---

## 结论

**最关键的一跳是第 12 步：`ExchangeOrderBuilderV2.buildOrderSignature` → `signTypedDataWithSigner`。**

原因：Polymarket CLOB 采用 **链下签名、链上验证** 模型——REST `POST /order` 提交的 body 必须携带对 CTF Exchange 合约 domain 的有效 EIP-712 签名，服务端才会接受并写入订单簿。前面所有 tick 查询、数量舍入、HMAC 鉴权都是为这一步服务；若签名无效或与 maker/signer/amount 不一致，后续 HTTP 必然失败。对 SDK 使用者而言，**「把用户意图变成可被 Exchange 合约认可的 SignedOrder」** 是整个交易链路中唯一不可省略、且最具链上语义的核心环节。
