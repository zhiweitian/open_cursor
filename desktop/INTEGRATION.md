# agent-core 接入 CortexIDE Fork

CortexIDE AI 代码主要在：

`desktop/cortexide/src/vs/workbench/contrib/cortexide/`

## 接入策略（推荐分三步）

### 1. 配置对齐（快）

- 在 CortexIDE 设置 UI 中已有 Provider / Model。
- 增加默认值：`https://api.deepseek.com` + `deepseek-flash`（与 OpenCursor `.env` 一致）。
- 文档：用户可在设置里自配 OpenAI 兼容 Base URL（已是 Cortex 目标）。

### 2. 工具层复用（中）

- 将 `packages/agent-core` 打包为 **Node 可执行 bundle**（esbuild），在 fork 里通过 **Utility Process / child_process** 调用：
  - 根目录：`npm run build:agent-cli` → `dist/opencursor-agent.cjs` + `dist/opencursor-patches.mjs`
  - 调用示例：

```bash
node dist/opencursor-agent.cjs '{"workspace":"/path/to/repo","message":"列出根目录文件","reviewWrites":true}'

命令面板（fork 内）：

- `OpenCursor: Review pending patches` — 预览 diff / accept / reject（Quick Pick 带 diff 摘要）
- `OpenCursor: Preview pending patch (diff editor)` — 直接打开 VS Code 并排 diff
- `OpenCursor: Accept all pending patches` — 批量 accept（并同步 Chat 气泡状态）
```

  -  stdout：`{ text, steps, runId }`（配置读工作区 `data/config.json` 与 `.env`）
  - 桌面 fork：**设置** → 打开 **OpenCursor agent-core (Chat)**，或命令面板 `OpenCursor: Run agent-core (Experimental)`
  - 需 `npm run build:agent-cli`；工作区含 `data/config.json` 或已在 Cortex 设置里配好 DeepSeek Key（会同步到 config）
  - **补丁审核**：工具行上的 ✓/✗，或命令面板 `OpenCursor: Review pending patches`（读写 `data/runs/*.json`）
- 或在 contrib 里 **TypeScript 直接 import** agent-core（需适配 ESM/CJS 与 VS Code 构建链，工作量大）。

### 3. UI 统一（慢）

- 保留 CortexIDE 原生 Chat / Apply / Checkpoint UI。
- 逐步替换 LLM 循环实现为 `runAgent()`，MCP 读 `data/mcp.json`（工作区根目录）。

## OpenCursor 独有、待移植

| agent-core | Cortex 侧 |
|------------|-----------|
| `explore_codebase` | 对接 Gather/Agent 模式 |
| MCP `McpHub` | Cortex 已有 MCP，可合并配置 |
| Rules / Skills | 注入 system prompt |
| diff 审核 run | 对接 Checkpoint 服务 |

## 开发顺序

1. fork 能 `./scripts/code.sh` 跑起来  
2. 确认 Cortex 里 Agent 能连 DeepSeek  
3. 抽共享 npm 包 `@opencursor/agent-core` 进 contrib 构建  
4. 再改 `product.json` 品牌 → 见 `REBRAND.md`
