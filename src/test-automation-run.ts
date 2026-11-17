import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runDueAutomations, runTool, saveAutomations, setChatCompletionForTests, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-auto-run-"));
setWorkspace(ws);
setChatCompletionForTests(async () => ({ role: "assistant", content: "ran-auto" }));

try {
  saveAutomations([{ id: "t", prompt: "说一句", everyMs: 1000, enabled: true }]);
  const runs = await runDueAutomations(5_000);
  assert("ran prompt", runs.length === 1 && runs[0]?.text === "ran-auto");
  const again = await runDueAutomations(5_100);
  assert("not due immediately", again.length === 0);
  const viaTool = await runTool("automation_run", { now: "9000" }, {});
  assert("tool runs later", viaTool.includes("ran-auto"));
} finally {
  setChatCompletionForTests(null);
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
