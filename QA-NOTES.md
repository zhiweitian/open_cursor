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
| `test:mcp-npx` | `npx` 启动官方 everything server 并调用 echo |
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
| `test:web-api` | 起 server，GET `/api/*`、`/api/file`、`/api/symbols`（无 Key） |
| `test:config-workspace` | `saveConfig` / `publicConfig` 落盘 |
| `test:file-tools` | read/search_replace/list/glob；grep/codebase **若无 rg 则 skip**；shell **若无 bash 则 skip** |
| `test:explore-contract` | `EXPLORE_READ_ONLY_TOOLS` 与 builtin 对齐 |
| `test:explore-loop` | `explore_codebase` 多轮 + mock LLM |
| `test:skills-rules` | skills + AGENTS.md + `.cursor/rules` |
| `test:system-prompt` | 系统提示含模型名、工具名、git 规则、审核写入 |
| `test:context-budget` | 单次 run 内丢掉过长的旧消息 |
| `test:complete` | 文件内标识符补全 |
| `test:complete-model` | 独立补全 URL，失败回退本地 |
| `test:completion-setup` | 保存补全地址，以及本地安装钩子 |
| `test:symbols` | function/class/type/const 行扫描 |
| `test:inline-edit` | 按行替换，含审核模式 |
| `test:file-index` | ripgrep 文件列表缓存后搜索 |
| `test:selection` | 编辑器选区写入会话并出现在提示里 |
| `test:automations` | 保存自动化并判断是否到期 |
| `test:automation-run` | 到期项交给 Agent，模拟模型回复 |
| `test:open-file` | 编辑器当前文件进入会话和提示 |
| `test:embeddings` | 词袋排序，以及未改文件沿用旧向量 |
| `test:todos` | `todo_write`、状态更新、未完成项进入提示 |
| `test:session` | `ask_question`、`switch_mode`、记录选择、当前目标 |
| `test:web-session` | `GET /api/session` 含目标，以及回答 |
| `test:canvas` | `canvas_write` 落盘表和时间线，按钮动作进入提示 |
| `test:notebook` | `edit_notebook` 改单个单元格 |
| `test:shell-jobs` | 后台 shell 启动、等待、拦截危险命令 |
| `test:web-fetch` | 本地 HTTP `web_fetch`，拒绝 file URL |
| `test:browser` | `browser_open` 读标题、链接和正文 |
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
- 补丁 **Checkpoint**：网页按钮和桌面 Chat 的 Checkpoint 都调用同一份 `restore` / `reapply`。
- 桌面 Tab 和 Canvas 走 `dist/opencursor-complete.mjs` 与补丁 CLI 的 `canvas`。要在已打开的 `.app` 里看到，需要重新 `desktop:build`，并先 `npm run build:agent-cli`。
- 右侧聊天空状态不再挂 Explain/Refactor 标签和底部历史列表。历史从聊天视图顶栏按钮打开。标签页下面重复的历史 / 设置已去掉。新对话只留在标签页右侧，快捷键仍是 Cmd+Shift+L。聊天页签改成浏览器式：上沿圆角，选中的一页和下面的面板连在一起。附上的文件只在输入框上方显示一排。要重新 `desktop:build` 才能在 `.app` 里看到。
- 没打开文件夹时，资源管理器展开并显示 Open Folder。上一版侧栏标题会串成 Failed to save 一类句子。
- 设置里可以存多把 API key，每把 key 多个模型。聊天下拉选择当前模型，请求带上那把 key 的地址。
- 设置增加 Rules / Skills 页，列出 Agent 会读的 `AGENTS.md`、`.cursor/rules`、`SKILL.md`。命令面板去掉 Explain/Refactor、Background Agent、Privacy Report、Audit Log、Review This File、Detect Errors、网页搜索。用量不再发到 PostHog。Ctrl+K 和 Apply 用当前选中的模型。要在 `.app` 里看到需要重新 `desktop:build`。
- Canvas 在编辑区单独一页，聊天里只留 Open Canvas。空窗口会打开资源管理器。设置 API 页可填 Tab 补全 URL 和模型名，请求会带上。Rules / Skills 可逐条关掉，写入工作区 `data/context-off.json`。聊天顶栏可重建文件索引。编辑器 Accept / Reject 会接受或拒绝当前文件的聊天补丁。预览待审补丁时，原文件会标出红绿；Accept 清掉标色，Reject 退回原文。新文件仍用对比窗口。Dock 图标换成深色圆环。设置源码只留 API / Rules / Skills / MCP。旧 Plan 的批准、继续、重试和旧工具卡的 Approve 已从界面拿掉。`_runChatAgent` 还在，子 Agent 和后台 Agent 的方法仍调用它。启动不再请求 OpenCortexIDE/cortexide 的 GitHub releases，也不再打开 opencortexide.com。安装包把 Agent 程序放在应用内 `opencursor/`，打开别的文件夹时用这份。状态栏看设置里的 API Key。设置有 Hooks 页，对应 `data/hooks.json` 和 `.cursor/hooks.json`；两者都在时 Agent 只读前者。接受过补丁的一轮可以在聊天里点「回到改前 / 回到改后」。未接受的补丁不会被这次点击回滚。聊天顶栏 Semantic 行重建 `data/embeddings.json`，默认词袋，不调用外部 Embeddings API。Tab 补全 URL 为空且当前文件没有候选项时，会用 `rg` 在其它源文件里补标识符，限时 200ms。工具调用后的下一轮请求会带上 `tool_calls[].type = function`，否则 DeepSeek 会报 `messages[n]: missing field type`。
- `llm.ts` stream 对 **thinking** 模型未单独测。
- fork 内 **本地 TS 补丁** 与上游 merge 可能冲突。

## 命令速查

```bash
npm test
npm run build:agent-cli
cd desktop/cortexide && npm run buildreact && npm run compile
```
