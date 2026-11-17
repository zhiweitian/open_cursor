# 品牌改为 OpenCursor

## 已完成（源码）

- `desktop/cortexide/product.json`：`OpenCursor` / `opencursor` / `.opencursor` / `urlProtocol`
- 部分 UI：`OpenCursor Agent`（终端 Agent 名、Apply 菜单）
- 重新打包后 Dock / 关于页 / 用户数据目录才会变成 OpenCursor

## 仍可选

- 图标：替换 `src/vs/workbench/browser/media/code-icon.svg`
- 批量替换 contrib 内硬编码 `CortexIDE` 文案（设置页、报错、更新提示等）
- `reportIssueUrl` 指向你自己的仓库

**注意**：CortexIDE 为上游 fork 名；发布时请用 **OpenCursor** 产品名，并保留 VS Code / 上游 LICENSE 声明。
