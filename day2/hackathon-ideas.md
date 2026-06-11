# Hackathon Product Research: 基于 clob-client-v2 的获奖 Idea 方案

## 项目背景

**clob-client-v2** 是 Polymarket 的 TypeScript SDK，提供：
- L1 认证（EIP-712 钱包签名）+ L2 认证（HMAC API Key）
- 限价单（GTC）、市价单（FOK/FAK）
- 订单簿查询、WebSocket 实时数据
- 支持 Polygon 主网/Amoy 测试网

**市场现状**：
- 2025 年预测市场总交易量达 $280-300 亿，同比增长 6 倍
- 2024-2025 年套利机器人累计盈利超 $4000 万
- AI 量化交易胜率可达 95-98%
- ETHGlobal Cannes 2026 已有 PolyAgents（AI 自动做市商）获奖

---

## Idea 1：Polymarket 社交跟单 Vault

### 解决什么问题
普通用户无法持续跟踪 AI 交易信号并自动执行，往往错过最佳跟单时机。

### 创新点
- **链上跟单协议**：将策略方的交易行为以加密承诺（keccak256 hash）存入 ENS，每次操作可验证
- **多模型 Ensemble**：Llama + Qwen + Gemini 三模型投票决策，胜率 > 75%
- **Vault 隔离执行**：跟单者资金在独立合约中，策略方无法直接操控
- **Kelly 动态仓位**：根据置信度自动调整仓位比例（上限 5%）

### 评估匹配度
| 维度 | 评分 | 说明 |
|------|------|------|
| 技术契合度 | ⭐⭐⭐⭐⭐ | clob-client-v2 完整支持订单创建、撤销、查询 |
| 创新性 | ⭐⭐⭐⭐ | 社交跟单 + 加密承诺为首次 |
| 市场潜力 | ⭐⭐⭐⭐ | $300 → $2.3M 的 bot 案例证明跟单需求旺盛 |
| 评委偏好 | ⭐⭐⭐⭐ | AI Agent + DeFi 组合为 2026 热门赛道 |

### 风险点
- 策略提供方恶意刷单导致跟单者亏损
- 多模型推理成本较高（~$0.001/次），需优化
- ENS 写入依赖 Sepolia 测试网，主网部署需额外审计

---

## Idea 2：跨平台套利引擎（Polymarket × Kalshi × 其他）

### 解决什么问题
预测市场存在严重的跨平台价格碎片化，同一事件在不同平台价差可达 3-10%，但手动发现和执行几乎不可能。

### 创新点
- **统一 API 网关**：同时对接 Polymarket CLOB、Polymarket REST、Kalshi API，用同一套数据结构处理
- **实时价差扫描**：每秒扫描 1000+ 预测市场，检测 YES+NO < $0.99 的无风险套利机会
- **自动执行机器人**：检测到机会后 50ms 内完成双边下单
- **跨链结算**：利用 Circle Bridge 在 Polygon 与其他链间划转 USDC

### 评估匹配度
| 维度 | 评分 | 说明 |
|------|------|------|
| 技术契合度 | ⭐⭐⭐⭐ | clob-client-v2 支持市价单、限价单、订单簿读取 |
| 创新性 | ⭐⭐⭐ | 套利逻辑已知，但全链路自动化 + 跨链较少见 |
| 市场潜力 | ⭐⭐⭐⭐⭐ | 已有 $40M+ 套利利润，机构级需求明确 |
| 评委偏好 | ⭐⭐⭐⭐ | 高盈利率 + 可验证的链上执行是核心亮点 |

### 风险点
- 平台流动性不足时无法完成双边下单
- 手续费（~1%）会吃掉小额套利利润
- Kalshi 对美国用户有限制，需做地域过滤
- 极端行情下订单可能无法即时成交

---

## Idea 3：企业级宏观风险对冲 Dashboard

### 解决什么问题
传统企业无法有效对冲政治/宏观风险（如"国会是否通过芯片关税？"），只能被动承受损失。

### 创新点
- **自然语言风险输入**：CFO 用自然语言描述风险场景，AI 自动匹配相关预测市场
- **合成对冲计算**：根据企业风险敞口（$10M）自动计算需要买入的合约数量
- **实时对冲看板**：展示当前对冲成本、敞口覆盖率、预期对冲效果
- **收益归因报告**：事件结束后生成对冲效果分析，供审计使用

### 评估匹配度
| 维度 | 评分 | 说明 |
|------|------|------|
| 技术契合度 | ⭐⭐⭐⭐ | 主要依赖订单簿读取 + 限价单，市价单使用较少 |
| 创新性 | ⭐⭐⭐⭐⭐ | 将预测市场带入传统金融场景，差异化极强 |
| 市场潜力 | ⭐⭐⭐⭐ | 企业对冲市场规模达兆亿美元级别 |
| 评委偏好 | ⭐⭐⭐⭐⭐ | B2B + 金融合规 + 预测市场 = 评委最爱 |

### 风险点
- 企业客户合规要求高，需 KYC/AML 集成
- 预测市场流动性可能无法承载大型机构仓位
- 自然语言理解可能出现偏差，导致对冲方向错误
- 需要专业法律团队审查对冲合规性

---

## 汇总表格

| Idea | 解决问题 | 核心创新 | 技术契合度 | 市场潜力 | 风险等级 |
|------|----------|----------|------------|----------|----------|
| **Idea 1** | 用户无法自动跟单 | 链上跟单协议 + 多模型 Ensemble | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 中 |
| **Idea 2** | 跨平台价格碎片化 | 实时扫描 + 50ms 自动执行 + 跨链结算 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 中高 |
| **Idea 3** | 企业无法对冲宏观风险 | 自然语言风险输入 + 合成对冲计算 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 中 |

---

## 推荐优先级

1. **Idea 2（跨平台套利引擎）** — 最容易出效果，$40M+ 套利利润已证明赛道成熟，链上可验证
2. **Idea 1（社交跟单 Vault）** — 差异化强，ENS + 加密承诺是创新点，符合 AI Agent 趋势
3. **Idea 3（企业对冲 Dashboard）** — 商业天花板最高，但企业合规周期长，适合 Hackathon 展示Demo

---

## 参考资料

- [clob-client-v2 GitHub](https://github.com/Polymarket/clob-client-v2)
- [PolyAgents - ETHGlobal Cannes 2026 Winner](https://ethglobal.com/showcase/polyagents-gt9jt)
- [Polymarket Signal Agent - Devpost](https://devpost.com/software/polymarket-signal-agent)
- [How to Build a Polymarket Arbitrage Bot: $40M Opportunity Guide](https://www.polytrackhq.app/blog/polymarket-arbitrage-bot-guide)
- [Claude Bot turned $1,000 into $14,216 in 48 hours](https://laikalabs.ai/prediction-markets/claude-polymarket-bot-guide)
