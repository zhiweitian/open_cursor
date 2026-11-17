import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listSymbols, runTool, setWorkspace } from "@opencursor/agent-core";

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

const src = `export class Box {}\nfunction run() {}\ninterface Item {}\nconst answer = 1\n`;
const hits = listSymbols(src);
assert("class", hits.some((h) => h.kind === "class" && h.name === "Box" && h.line === 1));
assert("function", hits.some((h) => h.kind === "function" && h.name === "run"));
assert("type", hits.some((h) => h.kind === "type" && h.name === "Item"));
assert("const", hits.some((h) => h.kind === "const" && h.name === "answer" && h.line === 4));

const ws = mkdtempSync(join(tmpdir(), "opencursor-symbols-"));
setWorkspace(ws);
try {
  writeFileSync(join(ws, "a.ts"), src);
  const out = await runTool("list_symbols", { path: "a.ts" }, {});
  assert("tool lists run", out.includes("function run"));
  writeFileSync(join(ws, "empty.txt"), "hello\n");
  const none = await runTool("list_symbols", { path: "empty.txt" }, {});
  assert("empty file", none.includes("无符号"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
