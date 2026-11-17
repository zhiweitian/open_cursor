import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import fg from "fast-glob";
import { workspace } from "./workspace.ts";

export type FileIndex = { builtAt: string; via: "rg" | "walk"; files: string[] };

const indexPath = () => join(workspace, "data", "file-index.json");

export function parseFileList(text: string): string[] {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("node_modules/") || line.includes("/node_modules/")) continue;
    if (line === ".git" || line.startsWith(".git/")) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    files.push(line);
    if (files.length >= 20_000) break;
  }
  return files;
}

export function loadFileIndex(): FileIndex | null {
  const path = indexPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as FileIndex;
    if (!Array.isArray(raw.files)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function refreshFileIndex(): FileIndex {
  const rg = spawnSync(
    "rg",
    ["--files", "--glob", "!node_modules/**", "--glob", "!.git/**", "--glob", "!data/**"],
    { cwd: workspace, encoding: "utf8", maxBuffer: 8_000_000 },
  );
  let files: string[];
  let via: FileIndex["via"];
  if (!rg.error && rg.status === 0) {
    files = parseFileList(rg.stdout || "");
    via = "rg";
  } else {
    files = parseFileList(
      fg
        .sync("**/*", {
          cwd: workspace,
          onlyFiles: true,
          dot: false,
          ignore: ["node_modules/**", ".git/**", "data/**"],
        })
        .join("\n"),
    );
    via = "walk";
  }
  const index: FileIndex = { builtAt: new Date().toISOString(), via, files };
  const path = indexPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(index));
  return index;
}

export function grepFileIndex(pattern: string): string {
  const index = loadFileIndex();
  if (!index?.files.length) return "索引为空，先调用 refresh_file_index";
  if (!pattern) return "缺少 pattern";
  const rg = spawnSync("rg", ["-n", "-m", "50", pattern, "--files-from", "-"], {
    cwd: workspace,
    input: index.files.join("\n"),
    encoding: "utf8",
    maxBuffer: 2_000_000,
  });
  if (!rg.error && (rg.status === 0 || rg.status === 1)) {
    return (rg.stdout || "(无匹配)").slice(0, 20_000);
  }
  const hits: string[] = [];
  for (const rel of index.files) {
    if (hits.length >= 50) break;
    let text = "";
    try {
      text = readFileSync(join(workspace, rel), "utf8");
    } catch {
      continue;
    }
    if (text.includes("\0")) continue;
    text.split("\n").forEach((line, i) => {
      if (hits.length < 50 && line.includes(pattern)) hits.push(`${rel}:${i + 1}:${line}`);
    });
  }
  return (hits.join("\n") || "(无匹配)").slice(0, 20_000);
}
