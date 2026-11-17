import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRun, listRunsSafe, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-runs-"));
setWorkspace(ws);

try {
  const run = createRun();
  assert("run file under workspace", existsSync(join(ws, "data", "runs", `${run.id}.json`)));
  assert("listRunsSafe scoped", listRunsSafe().length === 1 && listRunsSafe()[0]!.id === run.id);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
