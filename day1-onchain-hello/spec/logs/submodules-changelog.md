# Submodule 变更日志

## 2026-06-12 — 迁移至 ts-sdk 子模块

- **移除** `polymarket-clob/` → [Polymarket/clob-client-v2](https://github.com/Polymarket/clob-client-v2)（最后锁定 `d28dacd`）
- **添加** `ts-sdk/` → [Polymarket/ts-sdk](https://github.com/Polymarket/ts-sdk)
- 锁定 commit `58a81a7`（`main`，2026-06-11）
- 维护说明见 `spec/submodules.md`

## 2026-06-11 — 引入 polymarket-clob 子模块（已废弃）

- 添加 `polymarket-clob/` → [Polymarket/clob-client-v2](https://github.com/Polymarket/clob-client-v2)
- 锁定 commit `d28dacd`（ExchangeV3 order signing）
- 默认 clone 不下载；需源码时执行 `git submodule update --init`
