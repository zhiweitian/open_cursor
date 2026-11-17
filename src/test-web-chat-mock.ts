/**
 * POST /api/chat with OPENCURSOR_MOCK_LLM (isolated workspace, no API key).
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

const port = 38200 + Math.floor(Math.random() * 2000);
const root = join(import.meta.dirname, "..");
const ws = mkdtempSync(join(tmpdir(), "opencursor-web-chat-"));
mkdirSync(join(ws, "data"), { recursive: true });
writeFileSync(
  join(ws, "data", "config.json"),
  JSON.stringify({ provider: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-flash", apiKey: "", thinking: false }),
);

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
      OPENCURSOR_MOCK_LLM: "fast",
    },
    cwd: root,
    stdio: "ignore",
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/config`);
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
    const chat = await fetch(`http://127.0.0.1:${port}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi", reviewWrites: true, useMcp: false }),
    });
    const j = (await chat.json()) as { text?: string; runId?: string; error?: string };
    assert("POST /api/chat 200", chat.status === 200);
    assert("mock text", j.text === "mock-ok");
    assert("runId", typeof j.runId === "string" && j.runId.length > 8);
    if (j.runId) {
      const runGet = await fetch(`http://127.0.0.1:${port}/api/runs/${j.runId}`);
      assert("GET /api/runs/:id", runGet.status === 200);
    }

    const ping = await fetch(`http://127.0.0.1:${port}/api/test`, { method: "POST" });
    const pj = (await ping.json()) as { ok?: boolean; text?: string };
    assert("POST /api/test mock", ping.status === 200 && pj.ok === true && pj.text === "ok");
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);