import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { isIgnored } from "./ignore.ts";
import { workspace } from "./workspace.ts";

export type TreeNode = { name: string; path: string; type: "file" | "dir"; children?: TreeNode[] };

export function buildTree(sub = ".", depth = 4): TreeNode[] {
  const abs = join(workspace, sub);
  let names: string[] = [];
  try {
    names = readdirSync(abs).sort();
  } catch {
    return [];
  }
  const out: TreeNode[] = [];
  for (const name of names) {
    const rel = sub === "." ? name : `${sub}/${name}`;
    if (isIgnored(rel)) continue;
    const p = join(abs, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      out.push({
        name,
        path: rel,
        type: "dir",
        children: depth > 0 ? buildTree(rel, depth - 1) : [],
      });
    } else {
      out.push({ name, path: rel, type: "file" });
    }
  }
  return out;
}

export function workspaceInfo() {
  return { root: workspace, rel: relative(process.cwd(), workspace) || "." };
}
