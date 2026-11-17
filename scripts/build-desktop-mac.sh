#!/usr/bin/env bash
# 在本机打出可安装的 OpenCursor 桌面版（CortexIDE fork 底座）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CD="$ROOT/desktop/cortexide"
ARCH="$(uname -m)"
GULP="vscode-darwin-arm64"
[[ "$ARCH" == "x86_64" ]] && GULP="vscode-darwin-x64"

echo "==> cortexide @ $CD ($GULP)"
# 根 monorepo 的 @types/vscode 会被 TS 向上解析，与 src/vscode-dts 重复
VT="$ROOT/node_modules/@types/vscode"
VT_BAK="$ROOT/node_modules/.vscode-types-bak-opencursor-build"
if [[ -d "$VT" ]]; then
  echo "==> 临时移开 $VT（避免与 cortexide 类型重复）"
  rm -rf "$VT_BAK"
  mv "$VT" "$VT_BAK"
  restore_vscode_types() { [[ -d "$VT_BAK" ]] && mv "$VT_BAK" "$VT"; }
  trap restore_vscode_types EXIT
fi
cd "$CD"
if [[ ! -d node_modules ]]; then
  echo "==> npm install（首次约 10–30 分钟）"
  npm install
fi
APP_NAME="$(node -p "require('./product.json').nameShort")"
echo "==> buildreact"
npm run buildreact
echo "==> compile"
npm run compile
echo "==> gulp $GULP（约 15–30 分钟）"
npm run gulp "$GULP"
OUT="$CD/../VSCode-darwin-arm64"
[[ -d "$ROOT/desktop/VSCode-darwin-arm64" ]] && OUT="$ROOT/desktop/VSCode-darwin-arm64"
echo ""
echo "完成。应用目录："
echo "  $OUT/${APP_NAME}.app"
echo "拖到「应用程序」即可；首次打开若被拦截：系统设置 → 隐私与安全性 → 仍要打开"
