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

const ws = mkdtempSync(join(tmpdir(), "opencursor-abort-"));
setWorkspace(ws);
const ac = new AbortController();

setChatCompletionForTests(() =>
  new Promise((_resolve, reject) => {
    const timer = setTimeout(() => _resolve({ role: "assistant", content: "late" }), 10_000);
    ac.signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new Error("llm aborted"));
      },
      { once: true },
    );
  }),
);

try {
  const runPromise = runAgent("wait", { useMcp: false, signal: ac.signal });
  setTimeout(() => ac.abort(), 80);
  const out = await runPromise;
  assert("aborted text", out.text === "aborted");
} finally {
  setChatCompletionForTests(null);
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
