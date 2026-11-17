/**
 * POST /api/file reviewWrites stages a patch without touching disk until accept.
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

const port = 39700 + Math.floor(Math.random() * 2000);
const root = join(import.meta.dirname, "..");
const ws = mkdtempSync(join(tmpdir(), "opencursor-web-file-"));
mkdirSync(join(ws, "data"), { recursive: true });
writeFileSync(join(ws, "note.txt"), "keep\n");

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
      if ((await fetch(`http://127.0.0.1:${port}/api/tree`)).status === 200) {
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
    const missing = await fetch(`http://127.0.0.1:${port}/api/file`);
    assert("GET file missing path", missing.status === 400);

    const escape = await fetch(`http://127.0.0.1:${port}/api/file?path=${encodeURIComponent("../outside.txt")}`);
    assert("GET file escapes workspace", escape.status === 500);

    const staged = await fetch(`http://127.0.0.1:${port}/api/file`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: "note.txt", content: "staged\n", reviewWrites: true }),
    });
    const body = (await staged.json()) as { review?: boolean; runId?: string; patchId?: string };
    assert("stage review", staged.status === 200 && body.review === true && !!body.patchId);
    assert("disk untouched", readFileSync(join(ws, "note.txt"), "utf8") === "keep\n");

    const accept = await fetch(
      `http://127.0.0.1:${port}/api/runs/${body.runId}/patches/${body.patchId}/accept`,
      { method: "POST" },
    );
    assert("accept staged", accept.status === 200);
    assert("disk updated", readFileSync(join(ws, "note.txt"), "utf8") === "staged\n");
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
