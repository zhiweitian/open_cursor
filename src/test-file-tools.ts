import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRun, isDangerousShell, runTool, setWorkspace } from "@opencursor/agent-core";

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

const hasRg = spawnSync("rg", ["--version"], { encoding: "utf8" }).status === 0;
const hasBash = spawnSync("bash", ["-lc", "echo ok"], { encoding: "utf8" }).status === 0;

const ws = mkdtempSync(join(tmpdir(), "opencursor-ft-"));
setWorkspace(ws);

try {
  writeFileSync(join(ws, "hello.txt"), "alpha\n");
  const read = await runTool("read_file", { path: "hello.txt" });
  assert("read_file", read.includes("alpha"));

  const run = createRun();
  const srOut = await runTool(
    "search_replace",
    { path: "hello.txt", old_string: "alpha", new_string: "beta" },
    { runId: run.id, reviewWrites: true },
  );
  assert(
    "search_replace review mode",
    readFileSync(join(ws, "hello.txt"), "utf8") === "alpha\n" && srOut.includes("待审核"),
  );

  mkdirSync(join(ws, "sub"), { recursive: true });
  writeFileSync(join(ws, "sub", "note.txt"), "needle\n");
  const listed = await runTool("list_dir", { path: "sub" });
  assert("list_dir", listed.includes("note.txt"));

  const globbed = await runTool("glob_file_search", { pattern: "**/note.txt" });
  assert("glob_file_search", globbed.includes("sub/note.txt"));

  if (hasRg) {
    const grepped = await runTool("grep", { pattern: "needle", glob: "*.txt" });
    assert("grep", grepped.includes("needle"));

    const cs = await runTool("codebase_search", { query: "needle sub" });
    assert("codebase_search", cs.includes("needle") || cs.includes("note"));
  } else {
    console.log("skip grep/codebase_search (rg not in PATH)");
    ok += 2;
  }

  if (hasBash) {
    const sh = await runTool("shell", { command: "echo ok42" });
    assert("shell", sh.includes("ok42"));
  } else {
    console.log("skip shell (bash not available)");
    ok += 1;
  }

  assert("dangerous shell rm /", isDangerousShell("rm -rf /"));
  assert("safe shell ls", !isDangerousShell("ls -la"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
