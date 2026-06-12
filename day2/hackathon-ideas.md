# Hackathon 产品调研：基于 @polymarket/client (ts-sdk) 的获奖 Idea 方案

> 调研日期：2026-06-12  
> 技术基座：[Polymarket/ts-sdk](https://github.com/Polymarket/ts-sdk) — `@polymarket/client` / `@polymarket/bindings` / `@polymarket/types`  
> 评审参考：[Agora Agents Hackathon](https://agora.thecanteenapp.com/)（Canteen × Circle）

---

## 一、官方要求摘要

### 1.1 ts-sdk 核心能力（相对旧 clob-client-v2 的增量）

| 能力 | 说明 |
|------|------|
| 统一客户端 | 单包覆盖 CLOB + Gamma + Data + Relayer，workflow-first API |
| 工作流模型 | `AsyncGenerator` + `completeWith(signer)` 解耦签名/交易与业务逻辑 |
| 订单执行 | `placeLimitOrder` / `placeMarketOrder`；allowance 不足自动恢复 |
| RFQ 报价 | WebSocket quoter 会话（`openRfqSession`），EIP-712 V3 签名报价 |
| Combo / NegRisk | `listComboMarkets`、`listComboPositions`、组合条件 ID 推导 |
| Builder 归因 | `listBuilderTrades` / `listBuilderLeaderboard`；订单 builder 字段 |
| 钱包 | viem / ethers-v5 / Privy 适配；Deposit Wallet + gasless 交易流 |
| 运行时校验 | `@polymarket/bindings` 自动生成 Zod Schema，边界统一 parse |

### 1.2 Agora 黑客松评审维度

| 维度 | 权重 | 要点 |
|------|------|------|
| Agentic Sophistication | 30% | AI 做真实决策（发现 → 推理 → 下单/撤单/报价），非纯 UI 自动化 |
| Traction | 30% | 真实用户、真实交易、可量化 volume / 准确率 / 留存 |
| Circle 工具使用 | 20% | Arc 结算、CCTP、Gateway、USDC Paymaster、Wallets 等 |
| Innovation | 20% | 新 primitive、新垂直、可验证链上记录，避免 polished re-run |

**提交物：** 公开 GitHub（必填）+ 3 分钟视频（必填）+ Live URL（强烈建议）+ Traction 书面说明。

**六个 RFB（Requests for Builders）：** 永续 Agent / 预测市场 Trader Intelligence / 垂直市场 / 自适应组合 / 跨平台套利 / 社交跟单 — 非强制赛道，但对应空白方向。

---

## 二、已有生态项目（差异化边界）

| 项目 | 定位 | 已覆盖 | 空白地带 |
|------|------|--------|----------|
| [PolyAgents](https://github.com/Fbiondo00/PolyAgents) | ETHGlobal Cannes 2026 获奖；BTC 5 分钟二元做市 Vault | Gemini 决策、CLOB 下单、Hedera 审计 | 未用 RFQ / Combo；未深度 Builder 分成 |
| [Pythia](https://github.com/yxshee/pythia) | Agora 参赛；Bull/Bear 多智能体 + Kelly | 推理 trace、Arc pinning、纸面交易 | 偏分析推荐，operator 不碰资金；无 RFQ 报价层 |
| [Polymarket/agents](https://github.com/Polymarket/agents) | 官方 Python Agent 框架 | Gamma RAG、CLI 交易 | 框架层，非端到端产品 |
| 套利 Bot 生态 | $4000 万+ 累计利润 | 跨市场价差、毫秒执行 | 赛道极度拥挤，评委审美疲劳 |
| Signal / Discovery Agent | 自然语言搜市场 | 11-tool Agent、watchlist | 无执行闭环、无链上归因 |

**结论：** 避开「纯套利」和「又一个 Bull/Bear 分析器」，优先 ts-sdk **独有 surface** — RFQ quoter、Combo/NegRisk 组合、Builder 归因 + 统一 workflow — 这三个方向竞品几乎未产品化。

---

## 三、三个获奖 Idea 方案

### Idea 1：Trace2Trade — 可验证 AI 推理 → Builder 归因 → Arc 分成

**解决什么问题：** 现有 AI 预测市场 Agent（Pythia、Signal Agent 等）只输出文字建议，用户手动下单后无法证明「这笔成交是否来自该 Agent 的推理」；Agent 开发者也无法从成交中持续获利，商业模式停留在订阅/打赏。Canteen 研究明确指出：*"Builder codes as every LLM agent's monetization layer"*。

**创新点：** 用 ts-sdk 统一客户端完成「市场发现 → 结构化推理 → 下单 → 归因验证」全链路：`placeLimitOrder` 将 keccak256(推理 JSON) 写入订单 metadata；注册 Polymarket Builder Profile 后通过 builder 字段让每笔归因订单自动获得平台 fee 分成；完整推理 trace 锚定到 Arc（~$0.01/tx），Dashboard 用 `listBuilderTrades` 展示「推理-订单-成交」三联对照。直接命中 RFB 02（Trader Intelligence）+ RFB 06（Social Trading）+ Canteen Research #01（Reasoning traces as the product）。

**评估匹配度：** 技术契合度 ⭐⭐⭐⭐⭐（深度使用 trading + analytics + workflow）；创新性 ⭐⭐⭐⭐⭐（V2 metadata + builder 双 primitive 首个产品化）；市场潜力 ⭐⭐⭐⭐（Social Trading + trace 付费已验证）；评委偏好 ⭐⭐⭐⭐⭐（Agentic + Innovation 双高，与 PolyAgents/Pythia 清晰差异化）；Circle 工具 ⭐⭐⭐⭐（Arc trace pinning）；**综合匹配度：93/100**。

**风险点：** Builder Code 需完成 Polymarket 官方注册；metadata bytes32 尚无公开标准，需自建 schema；推理哈希与实盘 PnL 长期背离会损害 follower 信任；Arc pinning 增加基础设施依赖；两周 MVP 建议锁定单市场（如 Fed 决议）闭环。

---

### Idea 2：RFQMind — AI 做市商应答 RFQ 大宗报价

**解决什么问题：** Polymarket 头部市场流动性尚可，但机构/大户单笔 $10k+ 吃单滑点极高；平台已上线 RFQ（Request-for-Quote）协议，却几乎没有 Agent 自动监听报价请求、计算 fair value 并签名响应。现有获奖项目（PolyAgents、Pythia）全部走 CLOB 限价/市价路径，**RFQ 报价层完全空白**。

**创新点：** 基于 ts-sdk 独有的 `openRfqSession` WebSocket quoter 能力，Agent 7×24 监听 RFQ 请求流；LLM + 订单簿 mid + 宏观日历估算 fair value，在 `completeWith(signer)` 工作流内完成 EIP-712 V3 报价签名并提交；对超出风险阈值的请求自动 widen spread 或拒单；可选叠加 Builder 归因让「报价即推荐、成交即分成」。这是 ts-sdk **相对旧 SDK 的最大差异化 primitive**，展示完整 Agent 自主决策循环（监听 → 定价 → 签名 → 成交确认）。

**评估匹配度：** 技术契合度 ⭐⭐⭐⭐⭐（RFQ 是 ts-sdk 独有能力，竞品未覆盖）；创新性 ⭐⭐⭐⭐⭐（生态首个 RFQ quoter Agent）；市场潜力 ⭐⭐⭐⭐（机构 block trade 需求明确）；评委偏好 ⭐⭐⭐⭐（Agentic 强，WebSocket 实时决策可视化好 Demo）；Circle 工具 ⭐⭐⭐（可用 Arc 锚定报价决策 trace）；**综合匹配度：90/100**。

**风险点：** RFQ 请求量在 Demo 期可能偏薄，需准备 paper 模式 + 历史回放；报价签名延迟 >500ms 可能丢单；LLM 定价偏差导致逆向选择（informed taker 专挑错价 quote）；RFQ WebSocket 连接稳定性需重连逻辑；需配置 SecureClient + 充足 collateral。

---

### Idea 3：ComboRisk — NegRisk 组合敞口优化 Agent

**解决什么问题：** 预测市场中大量事件高度相关（如「Fed 3 月降息」「10Y 美债 <4%」「标普年度涨幅 >15%」），交易者逐笔独立下注导致过度敞口和资本效率低下；V2 NegRisk / Combo 清算已上线，但尚无 Agent 自动识别相关簇、计算净敞口并再平衡。Pythia 做单市场 Kelly，PolyAgents 做单事件做市 — **portfolio-level 决策层空白**。

**创新点：** Agent 通过 ts-sdk `listMarkets` + `listComboMarkets` 拉取全量市场，LLM + 图算法构建「事件相关图」；对同一 NegRisk 簇调用 `listComboPositions` 计算净敞口与边际 Kelly 仓位；以 `placeLimitOrder`（negRisk: true）执行跨合约风险净额化 rebalance；Arc 锚定每次 rebalance 决策与前后敞口快照，形成可审计组合轨迹。直接命中 RFB 02「Portfolio construction across correlated markets」。

**评估匹配度：** 技术契合度 ⭐⭐⭐⭐⭐（Combo/NegRisk 是 ts-sdk 原生能力）；创新性 ⭐⭐⭐⭐（组合优化 + NegRisk 清算，竞品未覆盖）；市场潜力 ⭐⭐⭐⭐（宏观/政治相关市场占 Polymarket 交易量 60%+）；评委偏好 ⭐⭐⭐⭐（展示完整自主 rebalance 循环）；Circle 工具 ⭐⭐⭐⭐（Arc 决策锚定 + 可选 CCTP 跨链 collateral）；**综合匹配度：88/100**。

**风险点：** NegRisk 簇流动性普遍薄于单事件市场，大单滑点高；LLM 误判相关关系可能导致对冲方向错误；再平衡频率过高侵蚀利润（手续费）；Demo 需精选 3–5 个高流动性相关簇，避免贪大求全；两周 MVP 可先 paper trade + 单簇（Fed + 利率相关）验证。

---

## 四、汇总对比表

| Idea | 解决问题 | 核心创新 | 技术契合度 | 创新性 | 市场潜力 | 获奖匹配度 | 风险等级 | 两周 MVP 可行性 |
|------|----------|----------|------------|--------|----------|------------|----------|----------------|
| **Trace2Trade** | AI 建议无法链上归因、Agent 无法从成交获利 | metadata 推理指纹 + builder 分成 + Arc trace pinning | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **93/100** | 中 | 高（单市场闭环即可 Demo） |
| **RFQMind** | 大宗交易滑点高、RFQ 无 Agent 应答 | ts-sdk RFQ quoter + AI fair value 定价 + 工作流签名 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **90/100** | 中高 | 中（需 RFQ 流量或回放） |
| **ComboRisk** | 相关事件独立下注导致敞口失控 | 事件相关图 + NegRisk 净敞口 + 组合 Kelly rebalance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **88/100** | 中高 | 中（需精选相关市场簇） |

---

## 五、推荐优先级

| 优先级 | Idea | 理由 |
|--------|------|------|
| 🥇 第一 | **Trace2Trade** | 商业模式最清晰（builder 分成）；Canteen 研究直接背书；与 PolyAgents/Pythia 差异化最大；Arc + metadata 双 primitive |
| 🥈 第二 | **RFQMind** | ts-sdk 独有 RFQ 能力，生态零竞品；Demo 视觉冲击力强（WebSocket 实时报价流） |
| 🥉 第三 | **ComboRisk** | 技术壁垒高、RFB 02 直接对应；适合展示 Agent 自主组合决策，但流动性风险需控 scope |

**两周 MVP 路径（以 Trace2Trade 为例）：**

```
Day 1-3   ts-sdk 接入 + createSecureClient + Builder Code 注册 + 单市场 paper trade
Day 4-7   结构化推理 JSON → metadata 哈希 → 实盘小单
Day 8-10  Arc trace pinning + Dashboard（listBuilderTrades 三联对照）
Day 11-14 视频录制 + 提交 + 邀请 5-10 真实用户跟单验证 traction
```

---

## 六、参考资料

- [Polymarket/ts-sdk](https://github.com/Polymarket/ts-sdk) — 官方 TypeScript SDK
- [@polymarket/client README](https://github.com/Polymarket/ts-sdk/tree/main/packages/client)
- [SDK Direction 设计文档](https://github.com/Polymarket/ts-sdk/blob/main/docs/sdk-direction.md)
- [Agora Agents Hackathon — RFBs & Judging](https://agora.thecanteenapp.com/)
- [Unbundling the Prediction Market Stack (Canteen)](https://thecanteenapp.com/analysis/2026/05/01/unbundling-the-prediction-market-stack.html)
- [PolyAgents — ETHGlobal Cannes 2026](https://github.com/Fbiondo00/PolyAgents)
- [Pythia — Agora Hackathon](https://github.com/yxshee/pythia)
- [Polymarket/agents 官方框架](https://github.com/Polymarket/agents)
- 本地调研：[ts-sdk-research.md](../day1-onchain-hello/spec/ts-sdk-origin-doc/ts-sdk-research.md)
