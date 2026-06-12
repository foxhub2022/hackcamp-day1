# Git Submodule 维护说明

本仓库通过 **git submodule** 引用上游 Polymarket 官方 TypeScript SDK 源码，作为本地只读参考。**业务代码运行时依赖仍通过 npm 安装对应包**（见各 Day 子项目 `package.json`）。

---

## 子模块一览

| 目录 | 上游仓库 | 用途 |
|------|----------|------|
| `ts-sdk/` | [Polymarket/ts-sdk](https://github.com/Polymarket/ts-sdk) | 统一 TS SDK monorepo（`packages/client`、`packages/types`、`examples/scripts` 等） |

配置文件：仓库根目录 [`.gitmodules`](../../.gitmodules)。

> **迁移说明**：2026-06-12 起，`polymarket-clob/`（旧 [clob-client-v2](https://github.com/Polymarket/clob-client-v2)）已替换为本子模块。历史调研文档仍引用旧路径，阅读时注意对照 [packages/client](https://github.com/Polymarket/ts-sdk/tree/main/packages/client)。

---

## 当前锁定版本

| 字段 | 值 |
|------|-----|
| 路径 | `ts-sdk/` |
| 提交 | `58a81a7d46aacbb74f05810268652cdd759ca7c6` |
| 简述 | `Merge pull request #124 from Polymarket/fix/dev-263-empty-string-icons` |
| 分支 | `main` |
| 日期 | 2026-06-11 |

> 父仓库只记录上述 commit SHA；更新上游后须在父仓库 commit 新的 SHA，并更新本表。

---

## 默认行为：clone 时不下载

普通克隆父仓库时，**不会**自动拉取子模块内容，`ts-sdk/` 为空目录占位。

```bash
git clone <HACKCAMP-repo-url>
# ts-sdk/ 此时无源码
```

需要源码时再初始化（见下文「首次拉取」）。

若希望克隆时一并拉子模块：

```bash
git clone --recurse-submodules <HACKCAMP-repo-url>
```

---

## 常用命令

### 首次拉取（clone 之后补下载）

在 HACKCAMP 根目录执行：

```bash
git submodule update --init --recursive
```

仅初始化 `ts-sdk`（浅克隆，省流量）：

```bash
git submodule update --init --depth 1 ts-sdk
```

### 查看状态

```bash
git submodule status
# 前缀 '-' = 未初始化；'+' = 子模块 commit 与父仓库记录不一致
```

### 进入子模块只读浏览

```bash
cd ts-sdk
git log -5 --oneline
ls packages/client/
ls examples/scripts/
```

**不要在子模块目录内直接改代码并 push**——这里是上游镜像，改动应在 HACKCAMP 业务代码（如 `day2/`、`day1-onchain-hello/src/`）中进行。

### 更新到上游最新 main

```bash
cd ts-sdk
git fetch origin
git checkout main
git pull origin main
cd ..
git add ts-sdk
git commit -m "chore: bump ts-sdk submodule"
```

更新后同步修改本文件「当前锁定版本」表，并在 `spec/logs/submodules-changelog.md` 追加 changelog。

### 更新到指定 commit

```bash
cd ts-sdk
git fetch origin
git checkout <commit-sha>
cd ..
git add ts-sdk
git commit -m "chore: pin ts-sdk to <commit-sha>"
```

### 删除子模块（ rarely ）

```bash
git submodule deinit -f ts-sdk
git rm -f ts-sdk
rm -rf .git/modules/ts-sdk
git commit -m "chore: remove ts-sdk submodule"
```

---

## 与 npm 依赖的关系

| 方式 | 场景 |
|------|------|
| npm 安装 Polymarket 官方包 | **业务代码 import**，打包与运行 |
| `ts-sdk/` 子模块 | 阅读 `packages/client`、`examples/scripts`、对照源码、hackathon 期间快速查 API |

两者版本不必完全一致，但重大 API 变更时建议 submodule 与 `package.json` 版本对齐。

---

## 变更记录

见 [`spec/logs/submodules-changelog.md`](logs/submodules-changelog.md)。
