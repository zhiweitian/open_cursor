/**
 * Smoke: bundled agent CLI loads (no LLM call).
 */
import { existsSync } from "node:fs";
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
  console.log("skip agent-cli-smoke (run npm run build:agent-cli first)");
  process.exit(0);
}

const noArgs = spawnSync(process.execPath, [agentCli], { encoding: "utf8" });
assert("agent CLI no-args exit != 0", noArgs.status !== 0);

const badJson = spawnSync(process.execPath, [agentCli, "not-json"], { encoding: "utf8" });
assert("agent CLI bad JSON exit != 0", badJson.status !== 0);

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
