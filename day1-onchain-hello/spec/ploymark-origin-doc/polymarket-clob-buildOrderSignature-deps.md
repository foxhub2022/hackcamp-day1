# 依赖分析：`ExchangeOrderBuilderV2.buildOrderSignature`

> **目标函数**：`polymarket-clob/src/order-utils/exchangeOrderBuilderV2.ts` · `ExchangeOrderBuilderV2.buildOrderSignature`（L149–L224）  
> **选取依据**：[执行链路](./polymarket-clob-createAndPostOrder-trace.md) 结论——整条 `createAndPostOrder` 路径中，**把用户意图变成链上可验证 SignedOrder 的唯一不可省略环节**  
> **假设变更 Y**：签名行为变更（TypedData 结构、POLY_1271 嵌套签名格式、返回值编码、或 domain 字段）  
> **分析日期**：2026-06-12 · submodule: `polymarket-clob/`

---

## 1. 它直接 import / require 了哪些东西？

`buildOrderSignature` 是类方法，**自身无 import**；依赖来自 `exchangeOrderBuilderV2.ts` 文件级 import 与实例字段。

### 1.1 文件级 import（`exchangeOrderBuilderV2.ts` L1–L15）

| 来源 | 符号 | 在 `buildOrderSignature` 中的用途 |
|------|------|-----------------------------------|
| `viem` | `encodeAbiParameters`, `keccak256`, `toHex`, `Address` | POLY_1271 分支：手工拼 `contentsHash`、拼接最终 signature bytes |
| `../constants.js` | `bytes32Zero` | POLY_1271 分支：`TypedDataSign.salt` 默认值 |
| `../signing/signer.js` | `ClobSigner`（type）, `signTypedDataWithSigner` | **核心**：EOA 与 POLY_1271 内层均调用此函数 |
| `./model/ctfExchangeV2TypedData.js` | `CTF_EXCHANGE_V2_DOMAIN_NAME`, `CTF_EXCHANGE_V2_ORDER_STRUCT`, `CTF_EXCHANGE_V3_DOMAIN_VERSION` | POLY_1271 内层 domain；V3 通过子类 `domainVersion` 间接影响 |
| `./model/eip712.js` | `EIP712TypedData`（type） | 入参类型 |
| `./model/order.js` | `OrderSignature`（type） | 返回值类型（`string`） |
| `./model/signatureTypeV2.js` | `SignatureTypeV2` | 分支：`POLY_1271` vs EOA |
| `./utils.js` | `generateOrderSalt` | 仅构造函数用，**不在** `buildOrderSignature` 内 |

### 1.2 实例字段（constructor 注入）

| 字段 | 类型 | 用途 |
|------|------|------|
| `this.signer` | `ClobSigner` | 传给 `signTypedDataWithSigner` |
| `this.chainId` | `number` | POLY_1271 内层 TypedDataSign |
| `this.contractAddress` | `string` | POLY_1271 内层 `verifyingContract` |
| `this.domainVersion` | `string` | POLY_1271 内层 domain version（V2 默认 / V3 子类覆盖） |
| `this.appDomainSep` | `` `0x${string}` `` | POLY_1271 分支：预计算的 app domain separator，拼进最终 signature |

### 1.3 模块级常量（同文件，非 import）

| 常量 | 用途 |
|------|------|
| `ORDER_TYPE_STRING` | POLY_1271：`contentsType` 字符串 |
| `ORDER_TYPE_HASH` | POLY_1271：`contentsHash` 计算 |
| `TYPED_DATA_SIGN_STRUCT` | POLY_1271 内层 EIP-712 struct 定义 |

### 1.4 函数内直接调用

| 被调函数 | 位置 | 分支 |
|----------|------|------|
| `signTypedDataWithSigner` | `signing/signer.ts` | EOA 主路径 + POLY_1271 内层 |
| `keccak256`, `encodeAbiParameters`, `toHex` | viem | 仅 POLY_1271 |
| `typedData.types.EIP712Domain` delete | 就地 mutation | 两分支入口（与 V1 相同惯例） |

---

## 2. 它被项目里哪些地方调用 / 引用？

### 2.1 直接调用（runtime）

| 调用方 | 文件 | 函数 | 说明 |
|--------|------|------|------|
| `ExchangeOrderBuilderV2.buildSignedOrder` | `order-utils/exchangeOrderBuilderV2.ts` L71 | 同文件 | **唯一生产路径入口**：`buildOrder` → `buildOrderTypedData` → `buildOrderSignature` |
| `ExchangeOrderBuilderV3` | 同上 L231–L239 | 继承 V2，**不 override** | v3 订单复用 V2 签名逻辑，仅 `domainVersion` 不同 |

**间接调用链（经 `buildSignedOrder`）**

```
order-builder/helpers/buildOrder.ts: buildOrderV2 / buildOrderV3
  → ExchangeOrderBuilderV2/V3.buildSignedOrder
    → buildOrderSignature

order-builder/helpers/createOrder.ts: createOrder
  → buildOrder(...)

order-builder/orderBuilder.ts: OrderBuilder.buildOrder
  → createOrder(...)

client.ts: ClobClient.createOrder
  → orderBuilder.buildOrder(...)

client.ts: ClobClient.createAndPostOrder
  → createOrder → … → buildOrderSignature
```

### 2.2 测试引用

| 文件 | 场景 |
|------|------|
| `tests/order-utils/exchangeOrderBuilderV2.test.ts` | `buildOrderSignature` golden signature（EOA + POLY_1271） |
| `tests/order-utils/exchangeOrderBuilderV2.test.ts` | `buildSignedOrder` 集成断言（间接覆盖） |
| `tests/order-builder/helpers/buildOrder.test.ts` | mock `ExchangeOrderBuilderV2`，测 version 路由 |
| `tests/order-builder/helpers/createOrder.test.ts` | 端到端 signed order（间接） |

### 2.3 文档 / 规范引用

| 文件 | 性质 |
|------|------|
| `day1-onchain-hello/spec/ploymark-origin-doc/polymarket-clob-createAndPostOrder-trace.md` | 标注为最关键一跳 |
| `day1-onchain-hello/spec/ploymark-origin-doc/polymarket-clob-createAndPostOrder-deps.md` | 间接依赖树 |

### 2.4 未被直接引用

- `examples/` 脚本不 import `buildOrderSignature`，只调 `ClobClient` 公开 API
- `day1-onchain-hello/src/` 当前无引用

---

## 3. 若入参 / 返回值 / 行为改成 Y，会有哪些地方需要同步改？

假设 **Y** = 修改 TypedData 结构、POLY_1271 字节拼接规则、或 `OrderSignature` 编码格式。

### 3.1 必改（同一文件 / 紧邻层）

| 文件 | 函数 / 内容 | 原因 |
|------|-------------|------|
| `order-utils/exchangeOrderBuilderV2.ts` | `buildOrderSignature` | 变更主体 |
| `order-utils/exchangeOrderBuilderV2.ts` | `buildOrderTypedData` | 若 message 字段与签名输入不一致 |
| `order-utils/model/ctfExchangeV2TypedData.ts` | `CTF_EXCHANGE_V2_ORDER_STRUCT` 等 | struct 定义须与合约一致 |
| `order-utils/exchangeOrderBuilderV2.ts` | `buildSignedOrder` | 若返回值 `SignedOrderV2.signature` 形态变化 |
| `types/ordersV2.ts` | `orderToJsonV2` | REST body 中 `signature` 字段序列化 |
| `signing/signer.ts` | `signTypedDataWithSigner` | 若需新 signer 类型或 viem/ethers 参数差异 |

### 3.2 可能改（上游组装）

| 文件 | 函数 | 触发条件 |
|------|------|----------|
| `order-builder/helpers/buildOrder.ts` | `buildOrderV2/V3` | 若 builder 构造参数变化 |
| `order-builder/helpers/createOrder.ts` | `createOrder` | 若 `OrderDataV2` 字段增删 |
| `order-builder/helpers/buildOrderCreationArgs.ts` | `buildOrderCreationArgs` | 若 maker/taker amount 影响签名 message |
| `config.ts` | `getContractConfig` | 若 `verifyingContract` 地址变更 |
| `types/unifiedOrder.ts` | `SignedOrder`, `isV2Order` | 联合类型判别 |

### 3.3 必改（测试 golden）

| 文件 | 说明 |
|------|------|
| `tests/order-utils/exchangeOrderBuilderV2.test.ts` | `buildOrderSignature` 断言 hash / sig |
| `tests/order-builder/helpers/createOrder.test.ts` | 端到端 signed order |
| `tests/signing/signer.test.ts` | 若底层 `signTypedDataWithSigner` 行为变 |

### 3.4 通常不需改（若 Y 仅限 v2 签名细节）

| 项 | 条件 |
|----|------|
| `signing/eip712.ts` · `buildClobEip712Signature` | L1 API Key 鉴权，与 Order 签名无关 |
| `signing/hmac.ts` · `buildPolyHmacSignature` | L2 REST 鉴权，与 Order EIP-712 无关 |
| `headers/index.ts` | 除非 REST 对 signature 字段校验规则变 |
| `createAndPostOrder` 公开签名 | 若仍返回服务端 JSON，入参不变 |

### 3.5 外部协调（仓库外）

| 系统 | 说明 |
|------|------|
| **CTF Exchange 智能合约** | `ecrecover` / EIP-1271 验证逻辑必须与 SDK 一致 |
| **Polymarket CLOB REST** | `POST /order` 校验 order signature |
| **链上 NegRisk / V3 部署** | `verifyingContract` 与 domain version 绑定 |

---

## 4. 项目里有没有「类似设计」的另一个函数？差异对比

### 4.1 主对比：`ExchangeOrderBuilderV1.buildOrderSignature`

| 维度 | V2 `buildOrderSignature` | V1 `buildOrderSignature` |
|------|--------------------------|--------------------------|
| 文件 | `order-utils/exchangeOrderBuilderV2.ts` L149–L224 | `order-utils/exchangeOrderBuilderV1.ts` L152–L161 |
| TypedData 常量 | `ctfExchangeV2TypedData.ts` | `ctfExchangeV1TypedData.ts` |
| Order struct 字段 | salt, maker, signer, tokenId, makerAmount, takerAmount, side, signatureType, **timestamp, metadata, builder** | 含 **taker, expiration, nonce, feeRateBps**；无 timestamp/metadata/builder |
| 签名分支 | **双分支**：EOA 标准 EIP-712 + **POLY_1271** 嵌套 `TypedDataSign` + 手工 bytes 拼接 | **单分支**：仅 `signTypedDataWithSigner` |
| signer 校验 | `buildOrder` 内；POLY_1271 跳过 EOA 地址检查 | `buildOrder` 内强制 EOA 地址匹配 |
| 构造函数 | 预计算 `appDomainSep`（POLY_1271 专用） | 无 |
| V3 扩展 | `ExchangeOrderBuilderV3 extends V2`，只改 `domainVersion` | 无 V3 |
| 调用入口 | `buildOrder(..., version: 2\|3)` | `buildOrder(..., version: 1)` |

**设计共性**：两者都遵循 **buildOrder → buildOrderTypedData → buildOrderSignature → buildSignedOrder** 四段式；都在签名前 `delete typedData.types.EIP712Domain`（ethers/viem 兼容惯例）。

**差异要点**：V2 为支持 **Deposit Wallet（POLY_1271）** 显著复杂化签名路径；V1 保持最简 EOA 712。改 Y 时须 **分别维护两套 builder**，不能假设 V2 改动自动适用于 V1 市场。

### 4.2 次要对比：`signing/eip712.ts` · `buildClobEip712Signature`

| 维度 | Order `buildOrderSignature` | API Key `buildClobEip712Signature` |
|------|----------------------------|-------------------------------------|
| EIP-712 domain | CTF Exchange 合约（`verifyingContract` = exchange 地址） | `ClobAuthDomain`（无 verifyingContract） |
| primaryType | `Order` 或 `TypedDataSign` | `ClobAuth` |
| 用途 | 订单授权，链上可验证 | L1 鉴权，换取 API Key |
| 共用底层 | `signTypedDataWithSigner` | 同左 |

**结论**：项目刻意把 **「订单签名」** 与 **「API 身份签名」** 拆成两套 TypedData，共用唯一签名适配层 `signTypedDataWithSigner`——这是可复用的 Web3 SDK 模式。

### 4.3 次要对比：`ExchangeOrderBuilderV3`

| 维度 | V2 | V3 |
|------|----|----|
| `buildOrderSignature` | 完整实现 | **继承，零 override** |
| 差异 | `domainVersion = CTF_EXCHANGE_V2_DOMAIN_VERSION` | `domainVersion = CTF_EXCHANGE_V3_DOMAIN_VERSION` |
| 设计意图 | 用 **子类只改 domain version** 避免复制 80+ 行 POLY_1271 逻辑 |

---

## 文档元信息

| 项 | 值 |
|----|-----|
| 分析目标 | `ExchangeOrderBuilderV2.buildOrderSignature` |
| 关联文档 | [顶层架构](./polymarket-clob-top-architecture.md) · [执行链路](./polymarket-clob-createAndPostOrder-trace.md) · [createAndPostOrder 依赖](./polymarket-clob-createAndPostOrder-deps.md) |
