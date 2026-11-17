import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTodos, runTool, setTodoStatus, setWorkspace, todoContext } from "@opencursor/agent-core";

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
  assert("open task in prompt", todoContext().includes("读文件") === false);

  await runTool(
    "todo_write",
    { merge: "true", todos: JSON.stringify([{ id: "b", content: "写测试", status: "pending" }]) },
    {},
  );
  assert("prompt lists open", todoContext().includes("写测试"));
  assert("mark done", setTodoStatus("b", "completed").includes("已更新"));
  assert("prompt clears", todoContext() === "");
  assert("missing id", setTodoStatus("nope", "completed").includes("不存在"));

  const port = 39500 + Math.floor(Math.random() * 600);
  const root = join(import.meta.dirname, "..");
  let child: ChildProcess | undefined;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  child = spawn(process.execPath, ["--import", "tsx", join(root, "src/server.ts")], {
    env: { ...process.env, PORT: String(port), OPENCURSOR_WORKSPACE: ws },
    cwd: root,
    stdio: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/todos`)).status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* starting */
    }
    await sleep(200);
  }
  assert("server started", ready);
  if (ready) {
    await runTool(
      "todo_write",
      { merge: "true", todos: JSON.stringify([{ id: "c", content: "打开页面", status: "pending" }]) },
      {},
    );
    const page = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert("chat has todos", page.includes('id="todos"') && page.includes("完成"));
    const posted = await fetch(`http://127.0.0.1:${port}/api/todos/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "c", status: "completed" }),
    });
    const body = (await posted.json()) as { ok?: boolean; todos?: { id: string; status: string }[] };
    assert(
      "http complete",
      posted.status === 200 && body.ok === true && body.todos?.find((t) => t.id === "c")?.status === "completed",
    );
  }
  child?.kill("SIGTERM");
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
