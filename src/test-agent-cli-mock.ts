/**
 * Bundled agent CLI stderr progress events with OPENCURSOR_MOCK_LLM (no API key).
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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
  console.log("skip agent-cli-mock (run npm run build:agent-cli first)");
  process.exit(0);
}

const ws = mkdtempSync(join(tmpdir(), "opencursor-cli-mock-"));
mkdirSync(join(ws, "data"), { recursive: true });

try {
  const payload = JSON.stringify({ workspace: ws, message: "mock", useMcp: false });
  const r = spawnSync(process.execPath, [agentCli, payload], {
    encoding: "utf8",
    env: { ...process.env, OPENCURSOR_MOCK_LLM: "tool" },
    cwd: ws,
  });
  assert("cli mock exit 0", r.status === 0);
  const events = (r.stderr || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { event?: string; text?: string });
  assert("stderr run", events.some((e) => e.event === "run"));
  assert("stderr tool_start", events.some((e) => e.event === "tool_start"));
  assert("stderr step", events.some((e) => e.event === "step"));
  assert("stderr llm", events.some((e) => e.event === "llm" && typeof e.text === "string"));
  const out = JSON.parse((r.stdout || "").trim()) as { text?: string; steps?: unknown[] };
  assert("stdout steps", (out.steps?.length ?? 0) >= 1);
  assert("stdout text", (out.text ?? "").includes("mock-tool-done"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
