/**
 * Web: mock LLM writes pending patch → accept via API (no Key).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

const port = 39600 + Math.floor(Math.random() * 2000);
const root = join(import.meta.dirname, "..");
const ws = mkdtempSync(join(tmpdir(), "opencursor-web-patch-"));
mkdirSync(join(ws, "data"), { recursive: true });
writeFileSync(join(ws, "mock-patch.txt"), "old\n");

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let child: ChildProcess | undefined;

try {
  child = spawn(process.execPath, ["--import", "tsx", join(root, "src/server.ts")], {
    env: {
      ...process.env,
      PORT: String(port),
      OPENCURSOR_WORKSPACE: ws,
      OPENCURSOR_MOCK_LLM: "review",
    },
    cwd: root,
    stdio: "ignore",
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/api/config`)).status === 200) {
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
    const chat = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "write patch", reviewWrites: true, useMcp: false }),
    });
    const j = (await chat.json()) as {
      runId?: string;
      patches?: { id: string; status: string; path: string }[];
    };
    assert("chat 200", chat.status === 200);
    assert("pending patch", (j.patches?.length ?? 0) === 1 && j.patches![0]!.status === "pending");
    assert("disk unchanged", readFileSync(join(ws, "mock-patch.txt"), "utf8") === "old\n");

    const patchId = j.patches![0]!.id;
    const accept = await fetch(`http://127.0.0.1:${port}/api/runs/${j.runId}/patches/${patchId}/accept`, {
      method: "POST",
    });
    assert("accept 200", accept.status === 200);
    assert("disk after accept", readFileSync(join(ws, "mock-patch.txt"), "utf8") === "new\n");

    const rejectRun = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "write again", reviewWrites: true, useMcp: false }),
    });
    const rj = (await rejectRun.json()) as { runId?: string; patches?: { id: string }[] };
    const p2 = rj.patches?.[0]?.id;
    assert("second pending", !!p2);
    if (p2 && rj.runId) {
      await fetch(`http://127.0.0.1:${port}/api/runs/${rj.runId}/patches/${p2}/reject`, { method: "POST" });
      assert("reject keeps disk", readFileSync(join(ws, "mock-patch.txt"), "utf8") === "new\n");
    }
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);