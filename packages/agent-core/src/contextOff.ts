import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

const filePath = () => join(workspace, "data", "context-off.json");

export function loadContextOff(): string[] {
  const path = filePath();
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { off?: unknown };
    if (!Array.isArray(raw.off)) return [];
    return raw.off.filter((item): item is string => typeof item === "string" && item.length > 0);
  } catch {
    return [];
  }
}

export function isContextOff(rel: string): boolean {
  return loadContextOff().includes(rel.replaceAll("\\", "/"));
}

export function setContextOff(rel: string, enabled: boolean): string[] {
  const path = rel.replaceAll("\\", "/");
  const off = new Set(loadContextOff());
  if (enabled) off.delete(path);
  else off.add(path);
  const next = [...off];
  mkdirSync(dirname(filePath()), { recursive: true });
  writeFileSync(filePath(), JSON.stringify({ off: next }, null, 2));
  return next;
}
