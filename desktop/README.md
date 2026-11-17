# OpenCursor Desktop（VS Code Fork）

本目录是 **完整 IDE 底座**：已 shallow clone [CortexIDE](https://github.com/OpenCortexIDE/cortexide)（Void → VS Code 1.118 fork）。

| 路径 | 说明 |
|------|------|
| `cortexide/` | 上游 fork 源码（~15k 文件） |
| `INTEGRATION.md` | 如何把 `packages/agent-core` 接进 fork |
| `REBRAND.md` | 改名为 OpenCursor 产品 |

## 构建 CortexIDE（首次较慢）

```bash
cd desktop/cortexide
npm install          # 可能 10–30+ 分钟
./scripts/code.sh    # macOS 开发窗口
```

Windows: `scripts\code.bat`  
详见 `cortexide/HOW_TO_CONTRIBUTE.md`。

## 和仓库其它部分的关系

```
opencursor/
├── desktop/cortexide/     ← Fork IDE（Tab、Agent UI、Apply 在这套里）
├── packages/agent-core/   ← 我们的 Agent 工具/MCP/diff（待接入 fork）
└── extension/             ← 轻量 VS Code 扩展（可选，调试 Agent 逻辑）
```

**当前状态**：fork 已拉取；**Agent 仍主要在 agent-core + extension**。下一步按 `INTEGRATION.md` 把模型配置与工具层并进 `src/vs/workbench/contrib/cortexide/`。

## 更新 fork

```bash
cd desktop/cortexide
git fetch origin
git pull --ff-only origin main
```

建议日后在 GitHub 上 **Fork CortexIDE → opencursor-desktop**，把 `origin` 改成你的仓库。
