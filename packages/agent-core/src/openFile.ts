import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

function openPath() {
  return join(workspace, "data", "open-file.json");
}

export function loadOpenFile(): string | null {
  const path = openPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { path?: string };
    return raw.path?.trim() || null;
  } catch {
    return null;
  }
}

export function setOpenFile(path: string): string {
  const rel = path.trim();
  if (!rel) return "缺少 path";
  mkdirSync(dirname(openPath()), { recursive: true });
  writeFileSync(openPath(), JSON.stringify({ path: rel }, null, 2));
  return `正在编辑 ${rel}`;
}

export function openFileContext(): string {
  const path = loadOpenFile();
  if (!path) return "";
  return `\n用户正在编辑：${path}。`;
}
