import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agentSystemPrompt, getConfig, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-prompt-"));
setWorkspace(ws);
try {
  const model = getConfig().model;
  const text = agentSystemPrompt(true);
  assert("names the configured model", text.includes(`当前模型：${model}`));
  assert("names a real tool", text.includes("read_file") && text.includes("grep"));
  assert("git only when asked", text.includes("只有用户明确要求时才提交"));
  assert("review writes", text.includes("待审核补丁"));
  assert("no review line when off", !agentSystemPrompt(false).includes("待审核补丁"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
if (fail) process.exit(1);
