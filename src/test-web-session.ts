/**
 * GET /api/session and POST /api/session/answer on an isolated workspace.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

const port = 39800 + Math.floor(Math.random() * 1500);
const root = join(import.meta.dirname, "..");
const ws = mkdtempSync(join(tmpdir(), "opencursor-web-session-"));
mkdirSync(join(ws, "data"), { recursive: true });
writeFileSync(
  join(ws, "data", "question.json"),
  JSON.stringify({
    prompt: "选一个",
    options: [
      { id: "a", label: "甲" },
      { id: "b", label: "乙" },
    ],
  }),
);
writeFileSync(join(ws, "data", "goal.json"), JSON.stringify({ title: "把目标显示出来", status: "active", note: "" }));

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let child: ChildProcess | undefined;

try {
  child = spawn(process.execPath, ["--import", "tsx", join(root, "src/server.ts")], {
    env: { ...process.env, PORT: String(port), OPENCURSOR_WORKSPACE: ws },
    cwd: root,
    stdio: "ignore",
  });
  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/session`)).status === 200) {
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
    const got = (await (await fetch(`http://127.0.0.1:${port}/api/session`)).json()) as {
      question?: { prompt?: string };
      goal?: { title?: string };
    };
    assert("question listed", got.question?.prompt === "选一个");
    assert("goal listed", got.goal?.title === "把目标显示出来");
    const page = await fetch(`http://127.0.0.1:${port}/`);
    const html = await page.text();
    assert("chat page has session", html.includes('id="session"') && html.includes("refreshSession"));
    const ans = await fetch(`http://127.0.0.1:${port}/api/session/answer`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ optionId: "b" }),
    });
    const body = (await ans.json()) as { text?: string; question?: unknown };
    assert("answer ok", ans.status === 200 && Boolean(body.text?.includes("乙")) && body.question == null);
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
