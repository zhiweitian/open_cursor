import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

export type EditorSelection = {
  path: string;
  startLine: number;
  endLine: number;
  text: string;
};

const MAX = 4_000;

function selectionPath() {
  return join(workspace, "data", "selection.json");
}

export function loadSelection(): EditorSelection | null {
  const path = selectionPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as EditorSelection;
    if (!raw.path || !raw.text || raw.startLine < 1 || raw.endLine < raw.startLine) return null;
    return raw;
  } catch {
    return null;
  }
}

export function setSelection(sel: EditorSelection): string {
  const path = sel.path.trim();
  if (!path) return "缺少 path";
  if (!Number.isInteger(sel.startLine) || !Number.isInteger(sel.endLine) || sel.startLine < 1 || sel.endLine < sel.startLine) {
    return "行号无效";
  }
  const text = (sel.text || "").slice(0, MAX);
  if (!text.trim()) return "选区是空的";
  const body: EditorSelection = { path, startLine: sel.startLine, endLine: sel.endLine, text };
  mkdirSync(dirname(selectionPath()), { recursive: true });
  writeFileSync(selectionPath(), JSON.stringify(body, null, 2));
  return `已附上 ${path}:${sel.startLine}-${sel.endLine}`;
}

export function clearSelection() {
  const path = selectionPath();
  if (existsSync(path)) unlinkSync(path);
}

export function selectionContext(): string {
  const sel = loadSelection();
  if (!sel) return "";
  return `\n用户选区 ${sel.path}:${sel.startLine}-${sel.endLine}：\n${sel.text}`;
}
