import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearSelection, selectionContext, setSelection, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-selection-"));
setWorkspace(ws);
writeFileSync(join(ws, "a.ts"), "export function alpha() {}\n");

const empty = setSelection({ path: "a.ts", startLine: 1, endLine: 1, text: "  " });
assert("empty text", empty.includes("空的"));
const bad = setSelection({ path: "a.ts", startLine: 3, endLine: 1, text: "x" });
assert("bad lines", bad.includes("行号无效"));
const saved = setSelection({ path: "a.ts", startLine: 1, endLine: 1, text: "export function alpha() {}" });
assert("saved", saved.includes("a.ts:1-1"));
assert("context", selectionContext().includes("alpha"));
clearSelection();
assert("cleared", selectionContext() === "");

const port = 39700 + Math.floor(Math.random() * 800);
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
    const post = await fetch(`http://127.0.0.1:${port}/api/selection`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "a.ts", startLine: 1, endLine: 1, text: "export function alpha() {}" }),
    });
    const body = (await post.json()) as { ok?: boolean; selection?: { path?: string } };
    assert("post selection", post.status === 200 && body.ok === true && body.selection?.path === "a.ts");
    const page = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert("chat shows clear", page.includes("清除选区"));
    const editor = await (await fetch(`http://127.0.0.1:${port}/editor`)).text();
    assert("editor attach", editor.includes("附到聊天"));
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
