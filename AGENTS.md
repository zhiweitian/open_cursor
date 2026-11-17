# Agent 约定（OpenCursor）

- 用中文回复，代码注释可英文。
- Agent 逻辑在 `packages/agent-core`；VS Code UI 在 `extension/`。
- 改 agent-core/CLI 后跑 `npm test`；需用户看的项写入 `手测清单.md`（并同步 `QA-NOTES.md`）。改扩展 `npm run build:ext`；改 fork React `desktop/cortexide` → `npm run buildreact`；改 fork TS 主进程 → 同目录 `npm run compile`。
- 不要提交 `.env` 或 API Key。
- 无 Key 测打包 CLI / Web：`OPENCURSOR_MOCK_LLM=fast|tool`（见 `QA-NOTES.md`）；CI 见 `.github/workflows/test.yml`。
