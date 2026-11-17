import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseFileList, refreshFileIndex, runTool, setWorkspace } from "@opencursor/agent-core";

let ok = 0;
let fail = 0;
function assert(name: string, cond: boolean) {
  if (cond) {
    ok++;
    console.log("✓", name);
  } else {
    fail++;
    console.log("✗", name);
  }
}

const parsed = parseFileList("src/a.ts\nnode_modules/pkg/index.js\n.git/config\nsrc/a.ts\n");
assert("keeps source", parsed.length === 1 && parsed[0] === "src/a.ts");

const ws = mkdtempSync(join(tmpdir(), "opencursor-index-"));
setWorkspace(ws);
try {
  mkdirSync(join(ws, "src"));
  writeFileSync(join(ws, "src", "note.txt"), "hello needle-token\n");
  const built = await runTool("refresh_file_index", {}, {});
  assert("refresh", built.includes("已索引") && built.includes("1"));
  const saved = JSON.parse(readFileSync(join(ws, "data", "file-index.json"), "utf8")) as {
    files: string[];
    via: string;
  };
  assert("saved path", saved.files.includes("src/note.txt"));
  assert("via", saved.via === "rg" || saved.via === "walk");
  const hit = await runTool("grep_index", { pattern: "needle-token" }, {});
  assert("grep hit", hit.includes("src/note.txt") && hit.includes("needle-token"));
  const direct = refreshFileIndex();
  assert("api count", direct.files.includes("src/note.txt"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
