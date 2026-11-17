# OpenCursor

**开源版 Cursor**：VS Code **Fork 桌面 IDE** + 可自配 **OpenAI 兼容 API**（DeepSeek / OpenAI / 自建网关）。

## 架构（2025）

```
desktop/cortexide/       VS Code Fork（CortexIDE → Void → Code-OSS）主产品
packages/agent-core/     Agent 工具 / MCP / diff / Rules（接入 fork 中）
extension/               可选：在官方 VS Code 里调试 Agent
web/ + npm start         可选：Web 调试
```

| 形态 | 适合 |
|------|------|
| **Desktop Fork** | 完整 IDE：Tab、Agent UI、Apply、Checkpoint（见 CortexIDE） |
| **Extension** | 不构建 fork，只在 VS Code 里用 Agent |
| **Web** | 快速试模型和工具 |

## Desktop（推荐）

Fork 已放在 `desktop/cortexide/`（[CortexIDE](https://github.com/OpenCortexIDE/cortexide)）。

```bash
cd desktop/cortexide
npm install              # 首次很慢
./scripts/code.sh        # macOS 开发版 IDE
```

说明：[desktop/README.md](./desktop/README.md)  
接入 agent-core：[desktop/INTEGRATION.md](./desktop/INTEGRATION.md)  
改名 OpenCursor：[desktop/REBRAND.md](./desktop/REBRAND.md)

若目录不存在：`npm run desktop:setup`  
本机安装包：`npm run desktop:build`（耗时长，产出 `desktop/VSCode-darwin-arm64/OpenCursor.app`）

Fork 侧调用 agent-core：`npm run build:agent-cli` → `dist/opencursor-agent.cjs`（见 `desktop/INTEGRATION.md`）

## Extension

```bash
npm install
npm run build:ext
# VS Code 打开本仓库 → F5
```

设置：`openCursor.apiKey`、`openCursor.baseUrl`、`openCursor.model`

## Web / CLI

```bash
cp .env.example .env
npm start                # http://127.0.0.1:3847
npm run cli -- "问题"
```

## 测试

```bash
npm test                 # typecheck + 52 套（见 QA-NOTES.md）
npm run build:agent-cli  # 打包 CLI 后再跑 test:cli-bundle / test:agent-cli-mock
```

无 API Key：`OPENCURSOR_MOCK_LLM=tool`（见 `AGENTS.md`）。

## 版本控制

- **根目录**：agent-core、Web、扩展、测试脚本（`git` 在仓库根）
- **`desktop/cortexide/`**：独立 git 仓库（OpenCursor IPC 改动在此提交，勿当普通子目录删改）
- **`data/`、`dist/`**：已 gitignore，勿提交 Key

## 目标

- 可审计、可换模型、可 MCP  
- 不是 Cursor 官方，不含其闭源 Tab 云与 Composer 后端  

详见 [plan.md](./plan.md)。

## 许可

- `packages/`、`extension/`、`web/`：MIT  
- `desktop/cortexide/`：遵循 VS Code / CortexIDE / 上游 LICENSE  
