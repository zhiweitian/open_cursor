# 自动化 / 手测缺口（Agent 维护）

**给你统一手测的清单 → [`手测清单.md`](手测清单.md)**（带 checkbox，测完打勾即可）。

本文件记录 **Agent 能自测的** 与 **必须人测或环境依赖的** 项。改相关功能时请更新。

## 已自动化（`npm test`）

| 脚本 | 覆盖 |
|------|------|
| `test:tools` | 路径、grep、skills、rules、@、tree |
| `test:patches` | stageWrite / accept / reject / syncDeepSeek |
| `test:cli-bundle` | `opencursor-patches.mjs` list / accept / reject |
| `test:mcp-hub` | `McpHub.connectAll` 跳过 disabled server（无子进程） |
| `test:mcp-live` | 本地 stdio MCP list + call |
| `test:hooks` | `loadHooks` + `fireHooks` 执行与 env |
| `test:workspace-env` | 子进程 `OPENCURSOR_WORKSPACE` |
| `test:web-mcp-probe` | 隔离目录 POST `/api/mcp/probe`（无子进程） |
| `test:agent-cli-smoke` | agent CLI 入口错误码 |
| `test:agent-loop` | `runAgent` 读文件 / 审核写 / Hooks（mock LLM） |
| `test:agent-llm-delta` | mock LLM 时 `onLlmDelta` 分片回调 |
| `test:agent-abort-signal` | `runAgent` + `AbortSignal` |
| `test:agent-cli-mock` | 打包 CLI + `OPENCURSOR_MOCK_LLM=tool` stderr 事件 |
| `test:agent-cli-abort` | 打包 CLI SIGKILL 慢 mock |
| `test:at-context` | `@` 去重 / 多文件 / 缺失 |
| `test:diff` | unifiedDiff 格式 |
| `test:sse` | OpenAI 兼容 SSE 行解析（无网络） |
| `test:mcp-config` | 默认/落盘 `data/mcp.json` |
| `test:runs-workspace` | `setWorkspace` 后 runs 落盘位置 |
| `test:web-api` | 起 server，GET `/api/*`、`/api/file`（无 Key） |
| `test:config-workspace` | `saveConfig` / `publicConfig` 落盘 |
| `test:file-tools` | read/search_replace/list/glob；grep/codebase **若无 rg 则 skip**；shell **若无 bash 则 skip** |
| `test:explore-contract` | `EXPLORE_READ_ONLY_TOOLS` 与 builtin 对齐 |
| `test:explore-loop` | `explore_codebase` 多轮 + mock LLM |
| `test:skills-rules` | skills + AGENTS.md + `.cursor/rules` |
| `test:context-budget` | 单次 run 内丢掉过长的旧消息 |
| `test:complete` | 文件内标识符补全 |
| `test:todos` | `todo_write` 替换与 merge |
| `test:session` | `ask_question`、`switch_mode`、记录选择 |
| `test:web-session` | `GET /api/session` 与回答 |
| `test:notebook` | `edit_notebook` 改单个单元格 |
| `test:shell-jobs` | 后台 shell 启动、等待、拦截危险命令 |
| `test:web-fetch` | 本地 HTTP `web_fetch`，拒绝 file URL |
| `test:web-search` | 未配置提示 + 本地 `OPENCURSOR_SEARCH_URL` |
| `test:web-file-review` | POST `/api/file` 审核写、越界路径 |
| `test:hooks-save` | `saveHooks` 落盘 |
| `test:web-restore` | 写文件 + restore |
| `test:web-chat-mock` | mock chat + GET run + POST `/api/test` |
| `test:web-patch-review` | `OPENCURSOR_MOCK_LLM=review` 审核写 + accept/reject |
| `npm test` 首步 | `typecheck` |

## Agent 不好测 / 需你本机验证

→ 具体步骤见 **[`手测清单.md`](手测清单.md)**，此处只列类别。

- 桌面 IDE（Electron、IPC、Checkpoint、Stop、补丁 UI）
- 真 LLM / MCP / explore_codebase
- Web **浏览器点击**（API 已有 `test:web-api`）
- 扩展 F5、`desktop:build` 安装包
- 双引擎（agent-core vs 原生 Cortex）

## 无 API Key 跑 Agent CLI

打包后（`npm run build:agent-cli`）可设环境变量 **`OPENCURSOR_MOCK_LLM`**：

| 值 | 行为 |
|----|------|
| `fast` | 直接回复 `mock-ok`（`pingModel` 仍返回 `ok`） |
| `tool` | `list_dir` + `mock-tool-done`，stderr 含 `run`/`tool_start`/`step`/`llm` |
| `review` | `write_file` 待审核补丁 + Web accept/reject 测 |
| `slow` 或 `slow:8000` | 长延迟（abort 测试） |

示例：`OPENCURSOR_MOCK_LLM=tool node dist/opencursor-agent.cjs '{"workspace":"/tmp/ws","message":"x","useMcp":false}'`

## 已知风险 / 待办

- **已修**：`mcp.json` / `data/runs` 曾在模块加载时固定路径，`setWorkspace()` 后不生效（现改为运行时 `join(workspace, …)`）。
- OpenCursor **tool** 流式状态与原生 `toolInfo` 结构不完全一致（UI 靠 `llmInfo.toolCallSoFar`）。
- **SIGKILL** 后 agent 子进程 exit code 因平台可能不是 137（已同时看 `signal`）。
- **`npm test`** 依赖本机 **`rg`（ripgrep）** 与 **`bash`**（`grep` / `codebase_search` / `shell` 工具测）。
- 补丁 **Checkpoint**：accept 时写 `tool_edit`（Chat 气泡 `patchPath` 或命令面板 `result.patch.path`）；回滚 UX 需手测清单 **A** 确认。
- `llm.ts` stream 对 **thinking** 模型未单独测。
- fork 内 **本地 TS 补丁** 与上游 merge 可能冲突。

## 命令速查

```bash
npm test
npm run build:agent-cli
cd desktop/cortexide && npm run buildreact && npm run compile
```
