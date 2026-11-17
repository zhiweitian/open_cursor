import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTodos, runTool, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-todos-"));
setWorkspace(ws);

try {
  const first = await runTool(
    "todo_write",
    { todos: JSON.stringify([{ id: "a", content: "读文件", status: "pending" }]) },
    {},
  );
  assert("writes pending", first.includes("pending a"));
  assert("persisted", loadTodos().length === 1);

  const merged = await runTool(
    "todo_write",
    {
      merge: "true",
      todos: JSON.stringify([{ id: "a", content: "读文件", status: "completed" }]),
    },
    {},
  );
  assert("merge updates status", merged.includes("completed a"));
  assert("still one item", loadTodos().length === 1);

  const bad = await runTool("todo_write", { todos: "not-json" }, {});
  assert("rejects bad json", bad.includes("合法 JSON"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
