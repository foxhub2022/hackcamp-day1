# Git Submodule 维护说明

本仓库通过 **git submodule** 引用上游 Polymarket CLOB 客户端源码，作为本地只读参考，**运行时依赖仍通过 npm 安装 `@polymarket/clob-client-v2`**。

---

## 子模块一览

| 目录 | 上游仓库 | 用途 |
|------|----------|------|
| `polymarket-clob/` | [Polymarket/clob-client-v2](https://github.com/Polymarket/clob-client-v2) | CLOB V2 TypeScript 客户端原始源码（examples、类型、实现参考） |

配置文件：仓库根目录 `.gitmodules`。

---

## 当前锁定版本

| 字段 | 值 |
|------|-----|
| 路径 | `polymarket-clob/` |
| 提交 | `d28dacdaed9e6ba29c013de588113fad3a20c4f2` |
| 简述 | `feat: support ExchangeV3 order signing (#79)` |
| 日期 | 2026-06-05 |
| 相对标签 | `v1.0.6` 之后 2 commit |

> 父仓库只记录上述 commit SHA；更新上游后须在父仓库 commit 新的 SHA，并更新本表。

---

## 默认行为：clone 时不下载

普通克隆父仓库时，**不会**自动拉取子模块内容，`polymarket-clob/` 为空目录占位。

```bash
git clone <HACKCAMP-repo-url>
# polymarket-clob/ 此时无源码
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

仅初始化 `polymarket-clob`（浅克隆，省流量）：

```bash
git submodule update --init --depth 1 polymarket-clob
```

### 查看状态

```bash
git submodule status
# 前缀 '-' = 未初始化；'+' = 子模块 commit 与父仓库记录不一致
```

### 进入子模块只读浏览

```bash
cd polymarket-clob
git log -5 --oneline
ls examples/
```

**不要在子模块目录内直接改代码并 push**——这里是上游镜像，改动应在 HACKCAMP 业务代码（如 `day2/liquidityforge/`）中进行。

### 更新到上游最新 main

```bash
cd polymarket-clob
git fetch origin
git checkout main
git pull origin main
cd ..
git add polymarket-clob
git commit -m "chore: bump polymarket-clob submodule"
```

更新后同步修改本文件「当前锁定版本」表，并在 `spec/logs/` 追加 changelog。

### 更新到指定 tag / commit

```bash
cd polymarket-clob
git fetch --tags origin
git checkout v1.0.6   # 或任意 commit
cd ..
git add polymarket-clob
git commit -m "chore: pin polymarket-clob to v1.0.6"
```

### 删除子模块（ rarely ）

```bash
git submodule deinit -f polymarket-clob
git rm -f polymarket-clob
rm -rf .git/modules/polymarket-clob
# 手动编辑 .gitmodules 若 git rm 未清理干净
git commit -m "chore: remove polymarket-clob submodule"
```

---

## 与 npm 依赖的关系

| 方式 | 场景 |
|------|------|
| `npm install @polymarket/clob-client-v2` | **业务代码 import**，打包与运行 |
| `polymarket-clob/` 子模块 | 阅读 `examples/`、对照源码、hackathon 期间快速查 API |

两者版本不必完全一致，但重大 API 变更时建议 submodule 与 `package.json` 版本对齐。

---

## 变更记录

见 `spec/logs/submodules-changelog.md`。
