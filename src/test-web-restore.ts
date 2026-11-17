/**
 * POST /api/runs/:id/restore on isolated workspace server.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const port = 39500 + Math.floor(Math.random() * 2000);
const root = join(import.meta.dirname, "..");
const ws = mkdtempSync(join(tmpdir(), "opencursor-web-restore-"));
mkdirSync(join(ws, "data"), { recursive: true });
writeFileSync(join(ws, "hello.txt"), "before\n");

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
      const r = await fetch(`http://127.0.0.1:${port}/api/tree`);
      if (r.status === 200) {
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
    const write = await fetch(`http://127.0.0.1:${port}/api/file`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "hello.txt", content: "after\n", reviewWrites: false }),
    });
    const wj = (await write.json()) as { runId?: string };
    assert("write ok", write.status === 200 && !!wj.runId);
    assert("disk after write", readFileSync(join(ws, "hello.txt"), "utf8") === "after\n");

    const restore = await fetch(`http://127.0.0.1:${port}/api/runs/${wj.runId}/restore`, { method: "POST" });
    const rj = (await restore.json()) as { restored?: number };
    assert("restore ok", restore.status === 200 && (rj.restored ?? 0) >= 1);
    assert("disk restored", readFileSync(join(ws, "hello.txt"), "utf8") === "before\n");
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
