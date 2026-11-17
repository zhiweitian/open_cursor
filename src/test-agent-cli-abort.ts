/**
 * SIGKILL bundled agent CLI during OPENCURSOR_MOCK_LLM=slow (no network).
 */
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const root = join(import.meta.dirname, "..");
const agentCli = join(root, "dist/opencursor-agent.cjs");

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

if (!existsSync(agentCli)) {
  console.log("skip agent-cli-abort (run npm run build:agent-cli first)");
  process.exit(0);
}

const ws = mkdtempSync(join(tmpdir(), "opencursor-cli-abort-"));

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let child: ChildProcess | undefined;

try {
  const payload = JSON.stringify({ workspace: ws, message: "slow", useMcp: false });
  child = spawn(process.execPath, [agentCli, payload], {
    env: { ...process.env, OPENCURSOR_MOCK_LLM: "slow:8000" },
    cwd: ws,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await sleep(250);
  child.kill("SIGKILL");
  const code = await new Promise<number | null>((resolve) => {
    child!.on("exit", (c, signal) => resolve(signal === "SIGKILL" ? 137 : c));
    setTimeout(() => resolve(child!.exitCode), 3000);
  });
  assert("killed non-zero", code !== 0 && code !== null);
} finally {
  child?.kill("SIGKILL");
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
