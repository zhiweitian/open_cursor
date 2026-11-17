/**
 * onLlmDelta during runAgent when LLM is mocked (simulates stream chunks).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAgent, setChatCompletionForTests, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-llm-delta-"));
setWorkspace(ws);

const finals: string[] = [];
setChatCompletionForTests(async () => ({
  role: "assistant",
  content: "你好流式",
}));

try {
  await runAgent("ping", {
    useMcp: false,
    onLlmDelta: (_d, full) => {
      finals.push(full);
    },
  });
  assert("onLlmDelta called", finals.length >= 2);
  assert("onLlmDelta final text", finals[finals.length - 1] === "你好流式");
} finally {
  setChatCompletionForTests(null);
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
