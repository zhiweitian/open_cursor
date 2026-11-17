# OpenCursor 计划

目标：**开源版 Cursor** — 以 VS Code 为编辑器壳，Agent / MCP / 自配模型 API 由 OpenCursor 提供。

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
| **Cursor SDK（可选）** | 直接跑 Cursor Local Agent 满血工具 | 未接；需要 `CURSOR_API_KEY` |

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
| WebSearch / WebFetch | `web_fetch` + `web_search` | 完成，已测（搜索需 `OPENCURSOR_SEARCH_URL`） |
| MCP 动态工具 | `mcp_{server}__{tool}` | 完成，已测（本地 echo server） |
| Task 子 Agent | `explore_codebase` 只读子 Agent | 完成，已测（`test:explore-loop` mock LLM） |
| TodoWrite / AskQuestion / SwitchMode | `todo_write`、`ask_question`、`switch_mode` | 完成，已测（Web 聊天页可点选答案） |
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
   - 简易 codebase_search — 完成，已测
   - ripgrep 索引封装 — 未做（已有 grep + codebase_search）
   - 符号 / embeddings — 符号 `list_symbols` 行扫描完成，已测；embeddings 未做
   - 忽略规则 — 完成，已测

5. **编辑器壳（Fork）**
   - **CortexIDE fork** `desktop/cortexide/` — 完成，已测（`npm install` + `compile` + `gulp vscode-darwin-arm64` → `.app`）
   - agent-core 接入 fork — **大部分完成**（Chat 开关 + IPC + 工具气泡 + diff + 审补丁 + 状态栏；**LLM 流式** stderr→Chat；accept 后重载已开文件；Checkpoint **未统一**）
   - 品牌改为 OpenCursor — 部分完成（`product.json` + 部分 UI；需 `npm run desktop:build` 重打 `.app`）
   - VS Code 扩展 `extension/` — 完成，未测（Agent 逻辑调试）
   - Monaco Web — 完成，已测（辅助；左侧符号列表跳转）

6. **Tab 补全**
   - 低延迟小模型，和聊天模型分开 — 未做
   - 本地标识符补全 `completeAt` + `POST /api/complete` + Web 编辑器 inline suggest — 完成，已测（无模型）

7. **扩展系统**
   - MCP Client + 配置页 — 完成，已测（本地 stdio echo；外网 npx fetch 仍需手测）
   - Skills 扫描注入 — 完成，已测
   - Rules（AGENTS.md / .cursor/rules）— 完成，已测
   - Hooks — 完成（`fireHooks`），已测
   - Cursor SDK 可选后端 — 未做

8. **账号与模型网关**
   - 鉴权、配额、BYOK — 未做（目前是本地配 Key，算 BYOK 雏形，未当产品功能测）

9. **完整产品**
   - Cloud Agent、Canvas、语音、浏览器工具、Automations — 未做

## 整体完成度（估算，2026-11-17）

| 口径 | 约 % | 说明 |
|------|------|------|
| **plan 里「自研 agent-core MVP」** | **~89%** | 行替换 inline edit、`npm test`（**43 套**）；仍缺 embeddings、小模型补全、外网 MCP |
| **「一个安装包 = OpenCursor」** | **~58%** | fork Chat agent-core + 补丁/流式/Stop + accept→Checkpoint；与原生 Cursor 壳仍两套 |
| **相对商业 Cursor 全功能** | **~18%** | 缺 Cloud Agent、Tab 产品化、账号网关、Canvas/语音/Automations、embeddings |

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
| 一键 | `npm test` | `typecheck` + **43 套**（`rg`/bash **可选**，缺则 skip 对应子测） |
| 手测 / 风险清单 | **`QA-NOTES.md`** | Agent 不好测项 |
| Web `/api/*`、扩展 UI | **无** | 曾手动 curl/Agent 测，无 CI |
| `explore_codebase` **契约** | `npm run test:explore-contract` | 只读工具白名单，无 LLM |
| `explore_codebase` **多轮** | `npm run test:explore-loop` | mock LLM，无 Key |
| MCP probe（隔离） | `npm run test:web-mcp-probe` | 临时 workspace、全 disabled |
| MCP 端到端（enabled+npx） | **无** | 需网络与子进程 |
| MCP 本地 stdio | `npm run test:mcp-live` | echo server list + call |
| 桌面 fork（Chat 开关、IPC、补丁 UI） | **无** | 需 `buildreact` + 本机 IDE 手测 |
| 完整 `desktop:build` | **无** | 曾成功打过包，非每次 CI |

后续：MCP fetch 真连接、Tab 补全、符号/embeddings、explore 集成测。每做完一项补 `完成` / `已测`。
