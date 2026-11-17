import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import { workspace } from "./workspace.ts";

const MAX = 12_000;

export function listRules() {
  const items: { path: string; bytes: number }[] = [];
  const agents = join(workspace, "AGENTS.md");
  if (existsSync(agents)) items.push({ path: "AGENTS.md", bytes: readFileSync(agents).length });
  for (const rel of fg.sync([".cursor/rules/**/*.md", ".cursor/rules/**/*.mdc"], { cwd: workspace, dot: true })) {
    items.push({ path: rel, bytes: readFileSync(join(workspace, rel)).length });
  }
  return items;
}

export function rulesSystemBlock() {
  const chunks: string[] = [];
  const agents = join(workspace, "AGENTS.md");
  if (existsSync(agents)) chunks.push(`## AGENTS.md\n${readFileSync(agents, "utf8").slice(0, MAX)}`);
  for (const rel of fg.sync([".cursor/rules/**/*.md", ".cursor/rules/**/*.mdc"], { cwd: workspace, dot: true })) {
    chunks.push(`## ${rel}\n${readFileSync(join(workspace, rel), "utf8").slice(0, MAX)}`);
  }
  if (!chunks.length) return "";
  return `\n项目 Rules（必须遵守）：\n${chunks.join("\n\n").slice(0, MAX)}`;
}
