# agent-core 接入 CortexIDE Fork

CortexIDE AI 代码主要在：

`desktop/cortexide/src/vs/workbench/contrib/cortexide/`

## 已实现（OpenCursor 桥）

| 能力 | 位置 |
|------|------|
| Chat 走 agent-core | `useOpenCursorAgentCore` + `chatThreadService._runOpenCursorAgentCoreBridge` |
| 子进程 CLI | `electron-main/opencursorAgentChannel.ts` → `dist/opencursor-agent.cjs` |
| 流式 / tool_start | stderr JSON → IPC `onStep` |
| 补丁审核 UI | `OpenCursorToolBubble.tsx` + `opencursorPatchActions.ts` |
| 可选 MCP | Settings **OpenCursor MCP tools** → `useMcp` |
| 就绪状态栏 | `opencursorStatusBar.ts` |

Fork 本地提交参考：见 `desktop/README.md`（独立 git 仓库）。

## 构建与手测

```bash
# monorepo 根
npm install
npm run build:agent-cli    # dist/opencursor-agent.cjs + opencursor-patches.mjs
npm test                   # 含 CLI mock / Web API（见 QA-NOTES.md）

# fork
cd desktop/cortexide
npm run buildreact && npm run compile   # 改过 React/TS 后
./scripts/code.sh
```

手测清单：仓库根 [`手测清单.md`](../手测清单.md)。

## CLI 调用示例

```bash
node dist/opencursor-agent.cjs '{"workspace":"/path/to/repo","message":"列出根目录","reviewWrites":true,"useMcp":false}'
```

无 API Key（与 CI 一致）：

```bash
export OPENCURSOR_MOCK_LLM=tool   # 或 fast / review / slow:3000
```

- **stdout**：`{ text, steps, runId, patches? }`
- **stderr**：`{event:"run"|"llm"|"tool_start"|"step", ...}`

补丁 CLI：

```bash
node dist/opencursor-patches.mjs '{"workspace":"...","op":"list"}'
```

## 命令面板（fork 内）

- `OpenCursor: Run agent-core (Experimental)`
- `OpenCursor: Review pending patches`
- `OpenCursor: Accept all pending patches`
- `OpenCursor: Preview pending patch (diff editor)`

配置：工作区 `data/config.json`、`.env`，或 Cortex DeepSeek 设置（启动时同步 Key）。

## 仍缺 / 后续

| agent-core | Cortex 侧 |
|------------|-----------|
| `explore_codebase` 产品化 | 子 Agent 结果在 Chat 展示 |
| MCP 与 Cortex MCP 配置合并 | 单页配置 |
| Checkpoint 深度统一 | accept 后回滚 UX（手测） |
| Rules / Skills | 已注入 system，Skills UI 可选 |

## 开发顺序

1. fork 能 `./scripts/code.sh` 跑起来  
2. 根目录 `build:agent-cli`，Settings 打开 OpenCursor agent-core  
3. 手测清单 A 节  
4. 品牌与安装包 → `REBRAND.md`、`npm run desktop:build`