# 品牌改为 OpenCursor

## 已完成（源码）

- `desktop/cortexide/product.json`：`OpenCursor` / `opencursor` / `.opencursor` / `urlProtocol`
- 反馈地址：`https://github.com/zhiweitian/open_cursor/issues/new`
- 用户能看到的文案：设置页、欢迎页、侧边栏、命令面板（Explain / Refactor 等）、更新提示、Apply 报错，已从 CortexIDE 改成 OpenCursor
- 重新打包后 Dock / 关于页 / 用户数据目录才会变成 OpenCursor

## 仍可选

- 图标：替换 `src/vs/workbench/browser/media/code-icon.svg`（Dock 图标仍是上游那套）
- 内部日志、统计事件名里还有 CortexIDE，不影响界面
- 批量替换其余 contrib 里不展示给用户的标识符

**注意**：CortexIDE 为上游 fork 名；发布时请用 **OpenCursor** 产品名，并保留 VS Code / 上游 LICENSE 声明。
