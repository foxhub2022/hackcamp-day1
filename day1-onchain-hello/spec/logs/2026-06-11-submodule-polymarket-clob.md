## 2026-06-11 — 引入 polymarket-clob 子模块

- **改了什么**：在仓库根目录添加 git submodule `polymarket-clob/`，指向上游 [Polymarket/clob-client-v2](https://github.com/Polymarket/clob-client-v2)；新增 `spec/submodules.md` 维护文档。
- **为什么改**：保留 CLOB V2 SDK 原始源码供对照阅读；默认 clone 不下载，按需 `git submodule update --init`。
- **锁定 commit**：`d28dacd` — feat: support ExchangeV3 order signing (#79)
