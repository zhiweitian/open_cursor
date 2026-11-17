import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dueAutomations, runTool, saveAutomations, setWorkspace, tickAutomations } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-auto-"));
setWorkspace(ws);

const saved = saveAutomations([
  { id: "soon", prompt: "跑一遍测试", everyMs: 1000, enabled: true },
  { id: "off", prompt: "不要跑", everyMs: 1000, enabled: false },
  { id: "bad", prompt: "太快", everyMs: 10, enabled: true },
]);
assert("drops short interval", saved.length === 2 && saved.every((item) => item.id !== "bad"));
assert("due when never run", dueAutomations(1_000).some((item) => item.id === "soon"));
assert("disabled skipped", !dueAutomations(1_000).some((item) => item.id === "off"));
const first = tickAutomations(5_000);
assert("tick returns prompt", first.length === 1 && first[0]?.prompt === "跑一遍测试");
assert("not due again", tickAutomations(5_500).length === 0);
assert("due after interval", dueAutomations(6_000).some((item) => item.id === "soon"));

const tool = await runTool(
  "automation_write",
  { automations: JSON.stringify([{ id: "night", prompt: "晚上看一眼", everyMs: 60_000 }]), merge: "true" },
  {},
);
assert("tool merge", tool.includes("night") && tool.includes("soon"));

const port = 39600 + Math.floor(Math.random() * 700);
const root = join(import.meta.dirname, "..");
let child: ChildProcess | undefined;
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

try {
  child = spawn(process.execPath, ["--import", "tsx", join(root, "src/server.ts")], {
    env: { ...process.env, PORT: String(port), OPENCURSOR_WORKSPACE: ws },
    cwd: root,
    stdio: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/automations`)).status === 200) {
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
    const listed = (await (await fetch(`http://127.0.0.1:${port}/api/automations`)).json()) as {
      automations?: { id: string }[];
    };
    assert("listed", (listed.automations || []).some((item) => item.id === "night"));
    const page = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert("chat button", page.includes("检查到期"));
    const tick = await fetch(`http://127.0.0.1:${port}/api/automations/tick`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ now: 9_000_000 }),
    });
    const body = (await tick.json()) as { due?: { id: string }[] };
    assert("http tick", tick.status === 200 && (body.due || []).some((item) => item.id === "night"));
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
