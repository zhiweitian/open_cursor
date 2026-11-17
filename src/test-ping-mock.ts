import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pingModel, setChatCompletionForTests, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-ping-"));
setWorkspace(ws);
setChatCompletionForTests(async () => ({ role: "assistant", content: "ok" }));

try {
  const text = await pingModel();
  assert("pingModel mock", text === "ok");
} finally {
  setChatCompletionForTests(null);
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
