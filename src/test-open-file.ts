import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openFileContext, setOpenFile, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-open-"));
setWorkspace(ws);
writeFileSync(join(ws, "a.ts"), "export const n = 1;\n");

assert("empty path", setOpenFile("  ").includes("缺少"));
assert("saved", setOpenFile("a.ts").includes("正在编辑"));
assert("context", openFileContext().includes("a.ts"));

const port = 39400 + Math.floor(Math.random() * 500);
const root = join(import.meta.dirname, "..");
let child: ChildProcess | undefined;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    const post = await fetch(`http://127.0.0.1:${port}/api/open-file`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "a.ts" }),
    });
    const body = (await post.json()) as { ok?: boolean; openFile?: string };
    assert("post open", post.status === 200 && body.ok === true && body.openFile === "a.ts");
    const session = (await (await fetch(`http://127.0.0.1:${port}/api/session`)).json()) as { openFile?: string };
    assert("session", session.openFile === "a.ts");
    const page = await (await fetch(`http://127.0.0.1:${port}/`)).text();
    assert("chat label", page.includes("正在编辑"));
    const editor = await (await fetch(`http://127.0.0.1:${port}/editor?path=a.ts`)).text();
    assert("editor posts", editor.includes("/api/open-file"));
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
