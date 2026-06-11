# Day 2 产品调研：基于 clob-client-v2 的获奖 Idea 方案

> 调研日期：2026-06-11  
> 技术基座：[Polymarket/clob-client-v2](https://github.com/Polymarket/clob-client-v2)  
> 评审参考：[Agora Agents Hackathon](https://agora.thecanteenapp.com/) 评分维度（Agentic 30% / Traction 30% / Circle 工具 20% / Innovation 20%）

---

## 一、项目要求摘要（clob-client-v2）

`clob-client-v2` 是 Polymarket CLOB V2 的官方 TypeScript SDK（V1 已于 2026-04-28 停用），核心能力如下：

| 能力 | 说明 |
|------|------|
| 双层认证 | L1 EIP-712 钱包签名创建 API Key；L2 HMAC 下单/撤单/查账 |
| 订单类型 | 限价单 GTC；市价单 FOK（全成或撤）/ FAK（部分成） |
| V2 原生字段 | 订单携带 `timestamp`、`metadata`（bytes32）、`builder`（builderCode 归因） |
| NegRisk | 支持 `negRisk: true` 的相关市场组合清算 |
| 抵押品 | pUSD（Polygon 上标准 ERC-20，由 USDC 背书） |
| 实时数据 | WebSocket 订单簿 + Gamma API 市场元数据 |

**黑客松隐含要求（从官方生态 + 获奖项目归纳）：**

1. AI 必须做**真实决策**（非纯 UI 自动化），最好形成闭环：发现市场 → 推理 → 下单/撤单
2. 必须有**可验证的链上/可审计记录**（Arc pinning、Hedera HCS、ENS 承诺等）
3. 优先使用 **V2 新 primitive**（builderCode 分成、metadata 归因），而非重复 V1 套利逻辑
4. 两周内可 Demo：视频 + 公开 GitHub + 最好有 live URL 和真实交互数据

---

## 二、已有生态项目（差异化边界）

| 项目 | 定位 | 已覆盖能力 | 空白地带 |
|------|------|-----------|----------|
| [PolyAgents](https://github.com/Fbiondo00/PolyAgents) | ETHGlobal Cannes 2026 获奖；BTC 5 分钟二元做市 Vault | Gemini 决策、CLOB 下单、Hedera 审计、ENS 策略哈希 | 仅短周期 crypto 二元；未用 V2 metadata/builder  monetization |
| [Pythia](https://github.com/yxshee/pythia) | Agora 参赛；Bull/Bear 多智能体 + Kelly 仓位 | 推理 trace 付费解锁、Arc pinning、纸面交易 | 偏分析/推荐，operator 不碰用户资金；未深度集成 CLOB V2 执行层 |
| [Polymarket/agents](https://github.com/Polymarket/agents) | 官方 Python Agent 框架 | Gamma API、RAG、CLI 交易 | 框架层，非端到端产品；无 builder 经济模型 |
| 套利 Bot 生态 | $4000 万+ 累计利润 | 跨市场价差扫描、毫秒执行 | 赛道极度拥挤；评委对「又一个 arb bot」审美疲劳 |
| Signal/Discovery Agent | 自然语言搜市场、新闻聚合 | 11-tool Agent、watchlist | 无执行闭环、无链上归因，Traction 难证明 |

**结论：** 获奖方向应避开「纯套利」和「又一个 Bull/Bear 分析器」，转向 **V2 原生归因层（builderCode + metadata）** 和 **NegRisk 组合管理** 这两个生态尚未产品化的能力。

---

## 三、三个获奖 Idea 方案

### Idea 1：Trace2Trade — 可验证 AI 推理 → 订单归因 → Builder 分成

**解决什么问题：** 现有 AI 预测市场 Agent（Pythia、Signal Agent 等）只输出文字建议，用户手动下单后无法证明「这笔交易是否来自该 Agent 的推理」；Agent 开发者也无法从成交中持续获利，商业模式停留在订阅/打赏。

**创新点：** 用 clob-client-v2 的 `metadata` 字段将结构化推理（JSON Schema 输出的 direction / confidence / sources）做 keccak256 哈希写入每一笔订单；同时注册 Polymarket Builder Profile，通过 `builderConfig: { builderCode }` 让每笔归因订单自动获得平台 fee 分成。完整推理 trace 锚定到 Arc（~$0.01/tx），形成「推理即产品、成交即变现」闭环——直接呼应 Canteen 研究笔记 *"Builder codes as every LLM agent's monetization layer"*。

**评估匹配度：**

- 技术契合度 ⭐⭐⭐⭐⭐ — 深度使用 `createAndPostOrder` + metadata + builderCode + WebSocket 订单簿
- 创新性 ⭐⭐⭐⭐⭐ — V2 上线后首个将 metadata 与 AI trace 绑定的产品形态
- 市场潜力 ⭐⭐⭐⭐ — Social Trading RFB + 推理 trace 付费已验证
- 评委偏好 ⭐⭐⭐⭐⭐ — Agentic + Innovation 双高，且与 PolyAgents/Pythia 清晰差异化
- **综合匹配度：92/100**

**风险点：** Builder Code 需完成 Polymarket 官方注册流程；`metadata` bytes32 语义尚未有公开标准，需自建 schema 并文档化；若推理哈希与实盘 PnL 长期背离，会影响 follower 信任；Arc pinning 增加基础设施依赖。

---

### Idea 2：NegRisk Brain — 相关事件组合敞口优化 Agent

**解决什么问题：** 预测市场中大量事件高度相关（如「Fed 3 月降息」「10Y 美债 <4%」「标普 500 年度涨幅 >15%」），交易者逐笔独立下注导致过度敞口和资本效率低下；V2 引入 NegRisk 清算但尚无 Agent 自动识别相关簇并优化净敞口。

**创新点：** Agent 从 Gamma API 拉取全量市场，用 LLM + 图算法构建「事件相关图」，对同一 NegRisk 簇计算净敞口与边际 Kelly 仓位；通过 clob-client-v2 以 `{ tickSize, negRisk: true }` 参数下单，实现跨合约风险净额化。对比 Pythia 的单市场 Kelly 和 PolyAgents 的单事件做市，这是 **portfolio-level** 的决策层创新，贴合 RFB 02「Portfolio construction across correlated markets」。

**评估匹配度：**

- 技术契合度 ⭐⭐⭐⭐⭐ — NegRisk 是 V2 SDK 独有能力，竞品未覆盖
- 创新性 ⭐⭐⭐⭐ — 组合优化 + NegRisk 原生清算
- 市场潜力 ⭐⭐⭐⭐ — 宏观/政治相关市场占 Polymarket 交易量 60%+
- 评委偏好 ⭐⭐⭐⭐ — Agentic 强，展示完整自主 rebalance 循环
- **综合匹配度：88/100**

**风险点：** NegRisk 市场流动性普遍薄于单事件市场，大单滑点高；LLM 误判相关关系可能导致对冲方向错误；组合再平衡频率过高会侵蚀利润（手续费 + gas）；Demo 阶段需精选 3–5 个高流动性相关簇，避免贪大求全。

---

### Idea 3：LiquidityForge — 长尾垂直市场 AI 做市 + 流动性供给

**解决什么问题：** Polymarket 头部市场（美国大选、BTC 价格）流动性充裕，但 RFB 03 强调的宏观数据发布（CPI、非农）、地缘政治、企业内预测等长尾垂直市场流动性极差甚至不存在；PolyAgents 聚焦 BTC 5 分钟，Pythia 偏体育/政治分析，**做市供给层** 仍是空白。

**创新点：** Agent 监控宏观日历（Fed、BLS、OECD）与新闻流，自动为即将发生的数据发布事件在 Polymarket 上识别/匹配对应市场；以 GTC 限价单在 bid-ask 两侧同时挂单（被动做市），根据订单簿深度和 AI 对 fair value 的估计动态调整 spread；用 WebSocket 实时监听成交流，在流动性枯竭时自动 widen spread 或撤单。可选叠加 pUSD wrap/unwrap 自动化管理抵押品余额。这是 **venue 层流动性供给** 而非 **agent 层方向押注**，与现有获奖项目正交。

**评估匹配度：**

- 技术契合度 ⭐⭐⭐⭐ — GTC 限价单 + 订单簿 WebSocket + Gamma 市场发现
- 创新性 ⭐⭐⭐⭐ — 长尾垂直 + 自动做市，填补生态空白
- 市场潜力 ⭐⭐⭐⭐⭐ — RFB 03 明确点名 macro/geopolitical verticals
- 评委偏好 ⭐⭐⭐⭐ — Traction 可通过真实挂单量和 spread 收窄证明
- **综合匹配度：86/100**

**风险点：** 做市面临逆向选择（informed trader 吃单）；长尾市场可能无对应 Polymarket 合约，需降级为「市场创建建议」而非实盘做市；资本占用高（双边挂单冻结 pUSD）；监管上做市行为在某些司法辖区需额外合规审查。

---

## 四、汇总对比表

| Idea | 解决问题 | 核心创新 | 技术契合度 | 创新性 | 市场潜力 | 获奖匹配度 | 风险等级 | 两周 MVP 可行性 |
|------|----------|----------|------------|--------|----------|------------|----------|----------------|
| **Trace2Trade** | AI 建议无法链上归因、Agent 无法从成交获利 | metadata 推理指纹 + builderCode 分成 + Arc trace pinning | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **92/100** | 中 | 高（单市场闭环即可 Demo） |
| **NegRisk Brain** | 相关事件独立下注导致敞口失控 | 事件相关图 + NegRisk 净敞口 + 组合 Kelly | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **88/100** | 中高 | 中（需精选相关市场簇） |
| **LiquidityForge** | 长尾垂直市场流动性枯竭 | 宏观日历驱动 + 双边 GTC 做市 + 动态 spread | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | **86/100** | 中高 | 中（建议先做单垂直，如 Fed 决议） |

---

## 五、推荐优先级与实施建议

| 优先级 | Idea | 理由 |
|--------|------|------|
| 🥇 第一 | **Trace2Trade** | 唯一深度利用 V2 `metadata` + `builderCode` 双 primitive；商业模式清晰；与 PolyAgents/Pythia 差异化最大；Canteen 研究直接背书 |
| 🥈 第二 | **NegRisk Brain** | 技术壁垒高、竞品空白；适合展示 Agent 自主组合决策能力 |
| 🥉 第三 | **LiquidityForge** | 商业天花板高（RFB 03），但做市风险和资本需求大，建议作为第二赛道或 Phase 2 |

**两周 MVP 路径（以 Trace2Trade 为例）：**

```
Day 1-3   clob-client-v2 接入 + Builder Code 注册 + 单市场 paper trade
Day 4-7   结构化推理 JSON → metadata 哈希 → 实盘小单（Amoy 测试网或主网小额）
Day 8-10  Arc trace pinning + 前端 Dashboard（推理-订单-成交 三联对照）
Day 11-14 视频录制 + 提交表单 + 邀请 5-10 真实用户跟单验证
```

---

## 六、参考资料

- [clob-client-v2 GitHub](https://github.com/Polymarket/clob-client-v2)
- [Polymarket CLOB V2 Migration Guide](https://docs.polymarket.com/v2-migration)
- [Unbundling the Prediction Market Stack (Canteen)](https://thecanteenapp.com/analysis/2026/05/01/unbundling-the-prediction-market-stack.html)
- [Agora Agents Hackathon — RFBs & Judging](https://agora.thecanteenapp.com/)
- [PolyAgents — ETHGlobal Cannes 2026](https://github.com/Fbiondo00/PolyAgents)
- [Pythia — Agora Hackathon](https://github.com/yxshee/pythia)
- [Polymarket/agents 官方框架](https://github.com/Polymarket/agents)
