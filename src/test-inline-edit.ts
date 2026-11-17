import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRun, runTool, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-inline-"));
setWorkspace(ws);

try {
  writeFileSync(join(ws, "a.txt"), "a\nb\nc\n");
  const out = await runTool(
    "inline_edit",
    { path: "a.txt", start_line: "2", end_line: "2", new_text: "B" },
    {},
  );
  assert("wrote", out.includes("已写入"));
  assert("middle line", readFileSync(join(ws, "a.txt"), "utf8") === "a\nB\nc\n");

  const bad = await runTool(
    "inline_edit",
    { path: "a.txt", start_line: "9", end_line: "9", new_text: "x" },
    {},
  );
  assert("bad range", bad.includes("行号无效"));

  writeFileSync(join(ws, "b.txt"), "one\ntwo\n");
  const run = createRun();
  const staged = await runTool(
    "inline_edit",
    { path: "b.txt", start_line: "1", end_line: "2", new_text: "only" },
    { runId: run.id, reviewWrites: true },
  );
  assert("review stages", staged.includes("待审核"));
  assert("disk unchanged", readFileSync(join(ws, "b.txt"), "utf8") === "one\ntwo\n");
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
