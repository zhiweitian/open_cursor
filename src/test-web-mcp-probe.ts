/**
 * POST /api/mcp/probe in isolated temp workspace (all MCP servers disabled).
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

const port = 39000 + Math.floor(Math.random() * 2000);
const root = join(import.meta.dirname, "..");
const ws = mkdtempSync(join(tmpdir(), "opencursor-probe-"));
mkdirSync(join(ws, "data"), { recursive: true });
writeFileSync(
  join(ws, "data", "mcp.json"),
  JSON.stringify({ servers: [{ id: "off", enabled: false, command: "npx", args: ["-y", "noop"] }] }),
);

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
      const r = await fetch(`http://127.0.0.1:${port}/api/mcp`);
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* starting */
    }
    await sleep(200);
  }
  assert("isolated server started", ready);

  if (ready) {
    const res = await fetch(`http://127.0.0.1:${port}/api/mcp/probe`, { method: "POST" });
    const json = (await res.json()) as { ok?: boolean; tools?: unknown[] };
    assert("POST /api/mcp/probe 200", res.status === 200);
    assert("probe ok", json.ok === true);
    assert("probe no tools", Array.isArray(json.tools) && json.tools.length === 0);
  }
} finally {
  child?.kill("SIGTERM");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
