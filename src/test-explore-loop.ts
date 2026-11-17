/**
 * explore_codebase multi-step loop with mocked LLM (no API key / network).
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTool, setChatCompletionForTests, setWorkspace, type ChatMsg } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-explore-"));
setWorkspace(ws);
mkdirSync(join(ws, "src"), { recursive: true });
writeFileSync(join(ws, "src", "hello.txt"), "hello explore\n");

let turn = 0;
setChatCompletionForTests(async (messages, tools) => {
  turn++;
  if (turn === 1) {
    return {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "c1",
          function: { name: "list_dir", arguments: JSON.stringify({ path: "src" }) },
        },
      ],
    } satisfies ChatMsg;
  }
  const lastTool = [...messages].reverse().find((m) => m.role === "tool");
  const sawHello = lastTool?.content?.includes("hello.txt");
  return {
    role: "assistant",
    content: sawHello ? "发现 src/hello.txt" : "未发现",
  };
});

try {
  const out = await runTool("explore_codebase", { task: "列出 src" }, {});
  assert("explore two turns", turn >= 2);
  assert("explore summary", out.includes("发现 src/hello.txt"));
  assert("explore rejects write in loop", !out.includes("write_file"));
} finally {
  setChatCompletionForTests(null);
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
