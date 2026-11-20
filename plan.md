# OpenCursor 计划

目标：提供和 Cursor 相似的体验。在本机用上 Cursor 那类 Agent / Skill / 工具，模型请求走自己的 API Key，不经过 Cursor 中转，不付 Cursor 的路由费。编辑器壳是 VS Code fork；Agent、模式、MCP、补丁由 OpenCursor 提供。不做 Cursor 云 Agent，也不接它的闭源 Tab 云和 Composer 后端。

## 收口（2026-11-19）

设置页左侧当时只有 API 和 MCP。下面这些页在代码里，但点不开：模型目录、本地模型发现、Ollama 向导、供应商列表、按功能另选模型、路由策略、YOLO、匿名上报、从别的编辑器导入、替换系统提示。命令面板里仍能搜到一批 CortexIDE / Void 命令。

### 拿掉

- 命令面板：`Start a Background Agent`、`Run agent-core (Experimental)`、`Show Privacy Report`、`Show Audit Log`、`Rebuild Repo Index`、`Review This File`、`Detect Errors`、`Search the Web`、`Open URL in Reader`、`Log Debug Info`
- 命令面板和右键：Explain、Refactor、Add Tests、Fix Tests、Docstring、Optimize、Debug、Ask About Selection、Explain This File、Fix Lint Errors、Summarize Changes
- 匿名用量上报（PostHog）。不再定时上报
- 设置里的供应商目录、路由、YOLO、Metrics、一键导入、另一段 AI Instructions：入口已不在左侧。死代码下一轮再删，避免一次拆掉两千行设置文件
- 旧 Cortex 聊天循环：界面已经不走。入口删完再删实现

### 要做

- **Rules / Skills 入口**：设置里能看到并打开 Agent 真正读的文件。Rules 是 `AGENTS.md` 和 `.cursor/rules`。Skills 是 `.cursor/skills/*/SKILL.md` 和 `skills/*/SKILL.md`。先做列出、打开、新建。逐条开关下一轮再做
- **Ctrl+K、Apply、行内编辑、生成提交信息**：都用当前选中的 Key 和模型，不再用按功能另选的模型
- **命令改名**：留下的命令从 CortexIDE / Void 改成 OpenCursor
- **Canvas**：聊天右侧一块面板。没有内容时不占位
- **Tab 补全**：设置 API 页可填补全 URL 和模型名。URL 空着仍走本地前缀
- **空窗口**：没打开文件夹时会打开资源管理器，显示 Open Folder
- **Rules / Skills**：可以逐条关掉。关掉的路径写在工作区 `data/context-off.json`，Agent 不再把它们放进提示
- **代码库索引**：聊天顶栏显示文件数，点击重建。命令 `OpenCursor: Rebuild file index`。这是文件列表索引，不是向量库
- **Dock 图标**：深色圆角方块加浅色圆环，替换了 `resources/darwin/code.icns`
- **编辑器 diff 和聊天补丁**：当前文件或 OpenCursor diff 上的 Accept / Reject 会接受或拒绝同一条聊天补丁，并刷新聊天里的状态

### 本轮状态

- 已打进安装包：Rules/Skills 开关、索引、Canvas 在聊天右侧、空窗口、Tab URL、Dock 深色圆环、编辑器 Accept / Reject 会处理同一条聊天补丁
- Tab 补全只走 OpenCursor。URL 空着用本地前缀，不再回落到 Cortex FIM

## 下一轮（2026-11-19）

明确不做：Cloud Agent、账号配额、Cursor SDK、云端定时任务、走 Cursor 的模型中转。语音以后再说。

### 先删

1. **设置死代码。** 已从 `Settings.tsx` 删掉模型目录、Ollama、供应商列表、按功能另选模型、路由、YOLO、用量上报、导入导出、旧 AI Instructions、旧的 `.cortexide/rules`。欢迎页只留 API 表单。`ToolApprovalTypeSwitch` 还在，但聊天里不再画出自动批准开关。
2. **旧聊天入口。** 已拿掉旧 Plan 的批准 / 继续 / 重试 / 跳过，以及旧工具卡的批准按钮。`_runChatAgent` 还在：子 Agent 和后台 Agent 的方法还调用它。界面上已经点不到。整段删掉会牵动工具类型和权限测试，先留着。
3. **上游更新检查。** 启动后不再请求 OpenCortexIDE/cortexide 的 GitHub releases，也不再打开 opencortexide.com。命令 `OpenCursor: Check for Updates` 只说明本机构建不跟上游版本。
4. **任意文件夹。** 安装包带上 Agent 程序。工作区里没有 `dist` 时，用应用内的那份。状态栏看设置里有没有 API Key，不再要求工作区里有 `data/config.json`。

### 再做

3. **编辑器行内 diff。** 聊天里点预览，会打开原文件并标出红绿。文件内容和补丁原文一致才走这条；新文件或编辑器里已经改过，仍用对比窗口。Accept 清掉标色并写入磁盘，Reject 把编辑器退回原文。
4. **Hooks 设置页。** 设置里可以打开或新建 `data/hooks.json`。两个文件都在时，Agent 只用 `data/hooks.json`。事件是 preTool、postTool、agentStop。
5. **桌面检查点。** 一轮里有已接受的改动时，聊天里出现「回到改前」。点一次把文件退回这一轮之前，再点「回到改后」写回已接受的内容。还没接受补丁时不会回滚。
6. **语义索引。** 聊天顶栏在文件索引旁边显示片段数。点一下按文件内容增量重建，写入工作区 `data/embeddings.json`。默认词袋；`OPENCURSOR_EMBED_MODEL=bge` 时用本机 BGE。命令 `OpenCursor: Rebuild semantic index`。
7. **Tab 补全。** 补全 URL 为空、当前文件也对不上时，用 `rg` 在工作区其它源文件里找这个标识符。当前文件里已经有候选项时，仍只用当前文件。不调用 Cursor 的补全服务。
8. **独立 Canvas。** 聊天里不再占右侧一列。有内容时顶栏出现 Open Canvas，在编辑区打开单独一页。命令 `OpenCursor: Open Canvas`。页里可以刷新，点按钮仍会记下动作。

## 当前对话里 Agent 实际能用的工具

### 文件与终端

- `Read` / `Write` / `StrReplace`：读改文件
- `Delete`：删文件
- `Glob` / `Grep`：按文件名、内容搜索
- `Shell`：跑命令
- `AwaitShell`：等后台任务
- `EditNotebook`：改 Jupyter
- `ReadLints`：读 IDE 诊断

### 规划与协作

- `AskQuestion`：选择题
- `TodoWrite`：任务清单
- `SwitchMode`：Agent / Plan 等模式
- `Task`：开子 Agent
- `CreateGoal` / `UpdateGoal`：长期目标

### 外部信息

- `WebSearch` / `WebFetch`
- `GenerateImage`（用户明确要求时）
- `FetchMcpResource`
- `GetDynamicTools` / `CallDynamicTool`：MCP / 动态工具

### 其他

- `SendToCall`：语音通话

子 Agent 类型：`explore`、`generalPurpose`、`cursor-guide`、`ci-investigator`、`bugbot`、`security-review`、`best-of-n-runner`。

## Cursor Skills（可 `/` 调用）

| Skill | 作用 |
|---|---|
| `create-skill` | 写新 Skill |
| `create-rule` | 写 Rules / AGENTS.md |
| `create-hook` | 写 Agent Hooks |
| `create-subagent` | 写自定义子 Agent |
| `update-cursor-settings` | 改 settings.json |
| `statusline` | CLI 状态栏 |
| `shell` | 终端相关配置 |
| `update-cli-config` | 改 CLI 配置 |
| `sdk` | 用 Cursor SDK 在程序里跑 Agent |
| `automate` | Automations |
| `autopilot` | 盯 PR：评论、冲突、CI |
| `loop` | 按间隔循环跑 prompt/skill |
| `goal` | 长期目标跑到完成 |
| `canvas` | 侧边栏交互画布 |
| `visualize` | 对话里出图/表 |
| `share` / `new-repo` / `origin` | 备份、托管仓库、origin CLI |
| `split-to-prs` | 改动拆成多个 PR |
| `review` / `review-bugbot` / `review-security` | 代码审查 |
| `onboard` | 项目上手 |
| `migrate-to-skills` | 旧规则迁到 Skills |
| `rename-chat` | 对话改名 |

项目级扩展：`.cursor/rules`、`.cursor/skills`、`AGENTS.md`、Hooks、MCP。

## Agent 工具集成策略

Cursor **没有**官方开源的「整套 Agent 工具 npm 包」。本仓库三条路：

| 路线 | 作用 | 本仓库 |
|---|---|---|
| **自研内置工具** | 文件 / 终端 / 搜索，稳定可控 | `src/tools.ts` |
| **MCP（开源协议 + SDK）** | 对齐 Cursor 的 `GetDynamicTools` / 外部集成 | `@modelcontextprotocol/sdk` + `data/mcp.json` |
| **Cursor SDK（可选）** | 直接跑 Cursor 官方 Agent | **明确不做**。本地 Agent 自研，不需要 `CURSOR_API_KEY` |

## Cursor Agent 工具 → mini-cursor 对照

| Cursor / 通用名 | mini-cursor | 状态 |
|---|---|---|
| Read | `read_file` | 完成，已测 |
| Write | `write_file` | 完成，已测 |
| StrReplace | `search_replace` | 完成，已测 |
| Delete | `delete_file` | 完成，已测 |
| Glob | `glob_file_search` | 完成，已测（`test:tools`） |
| Grep | `grep` | 完成，已测 |
| Shell | `shell` | 完成，已测 |
| ReadLints | `read_lints`（typecheck） | 完成，已测 |
| EditNotebook | `edit_notebook` 改 `.ipynb` 单元格 | 完成，已测 |
| WebSearch / WebFetch | `web_fetch` + `web_search` + `browser_open` | 完成，已测（`browser_open` 只解析 HTML，不跑脚本） |
| MCP 动态工具 | `mcp_{server}__{tool}` | 完成，已测（本地 echo server） |
| Task 子 Agent | `explore_codebase` 只读子 Agent | 完成，已测（`test:explore-loop` mock LLM） |
| TodoWrite / AskQuestion / SwitchMode | `todo_write`、`ask_question`、`switch_mode` | 完成，已测（聊天页可点完成；未完成项进入系统提示） |
| CreateGoal / UpdateGoal | `create_goal`、`update_goal` | 完成，已测（聊天页显示当前目标） |
| Skills | 扫描 `.cursor/skills`、`skills/` 注入 system | 完成，已测 |
| Rules | `AGENTS.md` + `.cursor/rules` 注入 system | 完成，已测 |
| Hooks | `loadHooks` + `fireHooks`（pre/post tool、agentStop） | 完成，已测；用户自配 shell |
| @文件 上下文 | `expandAtMentions` + 侧边栏插入 `@path` | 完成，已测 |
| codebase_search | `codebase_search`（rg 多词） | 完成，已测 |
| AwaitShell / 后台任务 | `shell_start` + `await_shell` | 完成，已测（进程内任务表） |

## 复用的开源组件（不重复造轮子）

| 依赖 | 用途 | 来源思路 |
|---|---|---|
| `@modelcontextprotocol/sdk` | MCP Client（同 Cline / Continue） | Anthropic MCP 官方 TS SDK |
| `fast-glob` | Glob 文件搜索 | 通用 |
| `ignore` | `.gitignore` / `.cursorignore` | 同 git 忽略语义 |
| `rg`（系统） | ripgrep 搜索 | 与 Cursor 一致 |

参考设计（不直接拷代码）：**Cline**（MCP + diff 审核）、**Continue**（工具 + 配置）、**Aider**（git 工作流）。

## Cursor 产品侧要对齐的能力

- 编辑器：VS Code 兼容（扩展、调试、终端、Git）
- Tab 补全：行内/多行预测
- Inline Edit：选中代码改一处（`inline_edit` 按行替换，已测）
- Chat / Agent：多文件改、跑终端、看 diff、回滚
- 上下文：打开文件、选区、`@文件`、代码库索引
- Apply：模型输出落到真实 diff
- Rules / Skills / Hooks / MCP
- 模型路由、隐私、用量
- Cloud Agent / PR Bot
- 检查点撤销

## 实现顺序

标记：`完成` = 代码已落地；`已测` = 测过并记下结果；空着就是还没做。

不要从套壳聊天开始。按下面做。

1. **Agent 循环（本仓库第一期）**
   - 读文件 `read_file` — 完成，已测
   - 写文件 `write_file` — 完成，已测
   - 替换 `search_replace` — 完成，已测
   - 删除 `delete_file` — 完成，已测
   - 读诊断 `read_lints` — 完成，已测
   - 简易代码搜索 `codebase_search` — 完成，已测
   - 只读探索子 Agent `explore_codebase` — 完成，已测（`test:explore-loop`）
   - Glob `glob_file_search` — 完成，已测
   - 列目录 `list_dir` — 完成，已测
   - 搜索 `grep` — 完成，已测
   - 终端 `shell` — 完成，已测
   - 工作区路径限制 — 完成，已测
   - 危险 shell 确认 — 完成，已测

2. **模型配置（Web）**
   - DeepSeek 官方接口（`https://api.deepseek.com` + `deepseek-flash`）— 完成，已测（`/models` 返回 flash/pro；直连聊天返回 `pong`）
   - 配置页保存供应商 / Base URL / 模型 / Key / thinking — 完成，已测（`GET/POST /api/config`；Key 脱敏返回）
   - 测试连接 — 完成，已测（`POST /api/test` 返回 `ok`）
   - 拉取模型列表 — 完成，已测（官方返回 `deepseek-flash`、`deepseek-v4-pro`）
   - Web 聊天调 Agent — 完成，已测（`POST /api/chat` 会跑工具并回文字；浏览器里点击未测）
   - CLI（`npm run cli`）— 完成，已测（单次提问跑 grep）

3. **补丁 UX**
   - 统一 diff — 完成，已测（`unifiedDiff` + Web 展示）
   - 接受/拒绝 — 完成，已测（`POST .../accept|reject`；审核模式下磁盘未先写入）
   - 检查点回滚 — 完成，已测（`POST .../restore` 恢复 snapshot）

4. **上下文引擎**
   - 文件树 — 完成，已测
   - `@文件` 附加上下文 — 完成，已测
   - 编辑器选区 — 完成，已测（附到聊天，系统提示带上选中文本）
   - 当前打开文件 — 完成，已测（编辑器打开后聊天页显示，并进入系统提示）
   - 简易 codebase_search — 完成，已测
   - ripgrep 索引封装 — 完成，已测（`refresh_file_index` + `grep_index`；无 rg 时目录遍历）
   - 符号 / embeddings — 符号行扫描完成。精确查找用 `grep`。`embedding_search` 只搜当前工作区，按文件内容增量更新。默认词袋；`OPENCURSOR_EMBED_MODEL=bge` 时用本机 `Xenova/bge-small-en-v1.5`，已接加载器。不调用 OpenAI Embeddings
   - 忽略规则 — 完成，已测

5. **编辑器壳（Fork）**
   - **CortexIDE fork** `desktop/cortexide/` — 完成，已测（`npm install` + `compile` + `gulp vscode-darwin-arm64` → `.app`）
   - agent-core 接入 fork — **大部分完成**（Chat 开关 + IPC + 工具气泡 + diff + 审补丁 + 状态栏；**LLM 流式** stderr→Chat；accept 后重载已开文件；网页 Checkpoint 与桌面 Checkpoint 共用同一份 run 快照）
   - 品牌改为 OpenCursor — 产品名、反馈地址、设置页 / 欢迎页 / 命令面板文案已改。安装包已打出：`desktop/VSCode-darwin-arm64/OpenCursor.app`。Dock 图标是深色圆环
   - VS Code 扩展 `extension/` — 完成，未测（Agent 逻辑调试）
   - Monaco Web — 完成，已测（辅助；左侧符号列表跳转）

6. **Tab 补全**
   - 低延迟小模型，和聊天模型分开 — 补全通道完成，已测。网页可一键安装或填 URL。桌面编辑器 Tab 只走 OpenCursor（`dist/opencursor-complete.mjs`），没有结果就不出补全
   - 本地标识符补全 `completeAt` + `POST /api/complete` + Web 编辑器 inline suggest — 完成，已测（无模型）

7. **扩展系统**
   - MCP Client + 配置页 — 完成，已测（本地 stdio echo；`npx @modelcontextprotocol/server-everything` 可连，无网络则跳过。旧的 `server-fetch` 包已不在 npm）
   - Skills 扫描注入 — 完成，已测
   - Rules（AGENTS.md / .cursor/rules）— 完成，已测
   - Hooks — 完成（`fireHooks`），已测
   - Cursor SDK 可选后端 — **明确不做**。本地 Agent 用自研 `agent-core`，不调用 Cursor 官方 SDK

8. **账号与模型网关**
   - 鉴权、配额 — **明确不做**。本地 IDE，用户自己配 Key
   - BYOK — 已有雏形（`data/config.json` 存 Key），未单独当产品功能测

9. **完整产品**
   - Cloud Agent — **明确不做**。那是 Cursor 云端虚拟机里的 Agent；本仓库只在用户电脑上跑
   - Canvas — **完成，已测**。网页和桌面都在聊天右侧。Agent 用 `canvas_write`。按钮点击记入下次提问。不是任意 React 源码
   - 语音 — **暂时不做**，以后可能要。作用是把语音转成聊天输入。若做，优先本机 Whisper 一类小模型，不必上云
   - 云端定时任务 — **明确不做**。本地 IDE 用现有的手动「跑到期的」
   - 浏览器工具 — `browser_open` 完成，已测（标题、链接、正文；不执行脚本，不是无头浏览器）
   - Automations — 到期检查与 `automation_run` 完成，已测（手动触发，没有常驻定时进程）

## 整体完成度（估算，2026-11-17）

| 口径 | 约 % | 说明 |
|------|------|------|
| **plan 里「自研 agent-core MVP」** | **~98%** | `npm test`（**54 套**）。补全模型不随包，配置页可一键下载到本机。Canvas 已接到聊天右侧 |
| **「一个安装包 = OpenCursor」** | **~58%** | fork Chat agent-core + 补丁/流式/Stop + 与网页共用 Checkpoint |
| **相对商业 Cursor 全功能** | **~18%** | Canvas 已有。仍缺 Tab 产品化、无头浏览器。语音暂时不做。Cloud Agent、账号配额、Cursor SDK、云端定时任务已决定不做 |

fork 自带 Chat/Apply/Checkpoint/MCP，若 **算「可用的类 Cursor 桌面」** 约 **~57%**（**CortexIDE 原生为主**，OpenCursor agent-core 为可选第二引擎）。

## 工作量

| 层级 | 范围 |
|---|---|
| 聊天 + 本地读改文件 | 周～月 |
| 能日常写代码的 Agent IDE | 人年 |
| 接近 Cursor | 团队年 |

法律：可借鉴架构，不能抄品牌、云服务和受许可约束的二进制。

## 本仓库进度

- CLI Agent（`npm run cli`）— 完成，已测
- 模型配置页 + Web 聊天（`npm start` → http://127.0.0.1:3847 ）— 完成，已测（补丁 accept/restore；浏览器点击未测）
- 工具自测脚本（`npm run test:tools`）— 完成，已测（随工具增加需重跑）
- 配置落盘 `data/config.json`（gitignore）— 完成，已测（保存后 `hasKey: true`，模型仍为 `deepseek-flash`）

默认 DeepSeek 官方：`https://api.deepseek.com`，模型 `deepseek-flash`。

## 测试覆盖（诚实）

| 范围 | 自动化 | 说明 |
|------|--------|------|
| agent-core 工具链 | `npm run test:tools` | grep/skills/rules/@/tree，**6 项** |
| 补丁 accept/reject/sync | `npm run test:patches` | 临时目录，**不碰真实仓库** |
| 打包 CLI | `npm run test:cli-bundle` | patches list/accept/reject；需先 `build:agent-cli` |
| Agent CLI 加载 | `npm run test:agent-cli-smoke` | 无 LLM，只测 CLI 入口 |
| 主 Agent 循环 | `npm run test:agent-loop` | mock LLM：tool→回复、审核写、Hooks |
| SSE 解析 | `npm run test:sse` | 无网络 |
| unifiedDiff | `npm run test:diff` | |
| MCP 配置读 | `npm run test:mcp-config` | 临时目录 |
| MCP Hub（无子进程） | `npm run test:mcp-hub` | 全 disabled |
| Hooks 配置读 | `npm run test:hooks` | 临时目录 |
| Web API smoke | `npm run test:web-api` | 临时端口起 server，无 Key |
| 主 Agent 流式回调 | `npm run test:agent-llm-delta` | mock 分片 |
| CI 无 Key 跑 CLI | `OPENCURSOR_MOCK_LLM=fast` | 与桌面 IPC 同 stderr 协议 |
| Web restore | `npm run test:web-restore` | 隔离 workspace |
| Web chat mock | `npm run test:web-chat-mock` | 无 Key |
| CI | `.github/workflows/test.yml` | `build:agent-cli` + `npm test` |
| Web 审核写 | `npm run test:web-patch-review` | mock `review` |
| 一键 | `npm test` | `typecheck` + **54 套**（`rg`/bash **可选**，缺则 skip 对应子测；`npx` MCP 无网络则跳过） |
| 手测 / 风险清单 | **`QA-NOTES.md`** | Agent 不好测项 |
| Web `/api/*`、扩展 UI | **无** | 曾手动 curl/Agent 测，无 CI |
| `explore_codebase` **契约** | `npm run test:explore-contract` | 只读工具白名单，无 LLM |
| `explore_codebase` **多轮** | `npm run test:explore-loop` | mock LLM，无 Key |
| MCP probe（隔离） | `npm run test:web-mcp-probe` | 临时 workspace、全 disabled |
| MCP 端到端（enabled+npx） | `npm run test:mcp-npx` | `@modelcontextprotocol/server-everything`；无网络 skip |
| MCP 本地 stdio | `npm run test:mcp-live` | echo server list + call |
| 桌面 fork（Chat 开关、IPC、补丁 UI） | **无** | 需 `buildreact` + 本机 IDE 手测 |
| 完整 `desktop:build` | **无** | 曾成功打过包，非每次 CI |

后续：补全模型由用户在配置页下载，不放进仓库。每做完一项补 `完成` / `已测`。
