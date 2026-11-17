import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ignore from "ignore";
import { workspace } from "./workspace.ts";

let ig: ReturnType<typeof ignore> | null = null;

function load() {
  ig = ignore();
  for (const file of [".gitignore", ".cursorignore"]) {
    const p = join(workspace, file);
    if (existsSync(p)) ig.add(readFileSync(p, "utf8"));
  }
  ig.add(["node_modules", "data/runs"]);
}

export function isIgnored(rel: string) {
  if (!ig) load();
  const p = rel.replace(/^\.\//, "");
  return ig!.ignores(p);
}
