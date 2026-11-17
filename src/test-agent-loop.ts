/**
 * Main runAgent loop: tool + reply, review write, hooks (mock LLM, no network).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRun,
  runAgent,
  saveHooks,
  setChatCompletionForTests,
  setWorkspace,
  type ChatMsg,
} from "@opencursor/agent-core";

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

async function withMock(fn: () => Promise<void>) {
  try {
    await fn();
  } finally {
    setChatCompletionForTests(null);
  }
}

const ws = mkdtempSync(join(tmpdir(), "opencursor-agent-loop-"));
setWorkspace(ws);
mkdirSync(join(ws, "data"), { recursive: true });

try {
  await withMock(async () => {
    writeFileSync(join(ws, "note.txt"), "alpha\n");
    let turn = 0;
    setChatCompletionForTests(async () => {
      turn++;
      if (turn === 1) {
        return {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "a1",
              function: { name: "read_file", arguments: JSON.stringify({ path: "note.txt" }) },
            },
          ],
        } satisfies ChatMsg;
      }
      return { role: "assistant", content: "已读到 alpha" };
    });
    const run = createRun();
    const out = await runAgent("读文件", { runId: run.id, useMcp: false });
    assert("agent tool step", out.steps.length === 1 && out.steps[0]!.tool === "read_file");
    assert("agent final text", out.text.includes("alpha"));
    assert("agent two llm turns", turn === 2);
  });

  await withMock(async () => {
    writeFileSync(join(ws, "note.txt"), "old\n");
    let turn = 0;
    setChatCompletionForTests(async () => {
      turn++;
      if (turn === 1) {
        return {
          role: "assistant",
          tool_calls: [
            {
              id: "w1",
              function: {
                name: "write_file",
                arguments: JSON.stringify({ path: "note.txt", content: "new\n" }),
              },
            },
          ],
        } satisfies ChatMsg;
      }
      return { role: "assistant", content: "已提交补丁" };
    });
    const run = createRun();
    const out = await runAgent("改文件", { runId: run.id, reviewWrites: true, useMcp: false });
    assert("review pending patch", out.patches.length === 1 && out.patches[0]!.status === "pending");
    assert("review disk unchanged", readFileSync(join(ws, "note.txt"), "utf8") === "old\n");
    assert("review step patch meta", Boolean(out.steps[0]?.patchId));
  });

  await withMock(async () => {
    rmSync(join(ws, ".hook-agent.txt"), { force: true });
    saveHooks({
      hooks: [{ event: "preTool", command: 'echo "$OPENCURSOR_HOOK_TOOL" > .hook-agent.txt' }],
    });
    let turn = 0;
    setChatCompletionForTests(async () => {
      turn++;
      if (turn === 1) {
        return {
          role: "assistant",
          tool_calls: [
            {
              id: "l1",
              function: { name: "list_dir", arguments: JSON.stringify({ path: "." }) },
            },
          ],
        } satisfies ChatMsg;
      }
      return { role: "assistant", content: "ok" };
    });
    await runAgent("列目录", { useMcp: false });
    assert("agent preTool hook", existsSync(join(ws, ".hook-agent.txt")));
    assert("hook tool name", readFileSync(join(ws, ".hook-agent.txt"), "utf8").trim() === "list_dir");
  });
} finally {
  setChatCompletionForTests(null);
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
