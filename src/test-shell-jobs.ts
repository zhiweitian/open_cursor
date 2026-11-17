import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTool, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-jobs-"));
setWorkspace(ws);

try {
  const started = await runTool("shell_start", { command: "echo job-ok" }, {});
  const id = started.match(/job-\d+/)?.[0];
  assert("started id", !!id);
  const done = await runTool("await_shell", { job_id: id || "", timeout_ms: "3000" }, {});
  assert("await output", done.includes("job-ok") && done.includes("code=0"));

  const missing = await runTool("await_shell", { job_id: "job-missing" }, {});
  assert("missing job", missing.includes("不存在"));

  const blocked = await runTool("shell_start", { command: "sudo echo x" }, {});
  assert("blocks sudo", blocked.includes("拦截"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
