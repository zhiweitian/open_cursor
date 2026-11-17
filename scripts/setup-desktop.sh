#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/desktop/cortexide"
if [[ -d "$DEST/.git" ]]; then
  echo "desktop/cortexide 已存在，跳过 clone"
  exit 0
fi
git clone --depth 1 --branch main https://github.com/OpenCortexIDE/cortexide.git "$DEST"
echo "完成。下一步: cd desktop/cortexide && npm install && ./scripts/code.sh"
