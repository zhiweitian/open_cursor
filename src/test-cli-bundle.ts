/**
 * Smoke-test bundled CLIs (requires npm run build:agent-cli first).
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRun, setWorkspace, stageWrite } from "@opencursor/agent-core";

const root = join(import.meta.dirname, "..");
const patchesCli = join(root, "dist/opencursor-patches.mjs");

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

if (!existsSync(patchesCli)) {
  console.log("skip cli-bundle (run npm run build:agent-cli first)");
  process.exit(0);
}

const ws = mkdtempSync(join(tmpdir(), "opencursor-cli-"));
setWorkspace(ws);
mkdirSync(join(ws, "data"), { recursive: true });
writeFileSync(join(ws, "data", "config.json"), JSON.stringify({ provider: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-flash", apiKey: "test", thinking: false }));
writeFileSync(join(ws, "patch-me.txt"), "before\n");

try {
  const list = spawnSync(process.execPath, [patchesCli, JSON.stringify({ workspace: ws, op: "list" })], {
    encoding: "utf8",
  });
  assert("patches CLI list exit 0", list.status === 0);
  assert("patches CLI list JSON", list.stdout.includes('"runs"'));

  const run = createRun();
  const patch = stageWrite(run.id, "patch-me.txt", "after\n");
  const accept = spawnSync(
    process.execPath,
    [patchesCli, JSON.stringify({ workspace: ws, op: "accept", runId: run.id, patchId: patch.id })],
    { encoding: "utf8" },
  );
  assert("patches CLI accept exit 0", accept.status === 0);
  assert("patches CLI accept writes disk", readFileSync(join(ws, "patch-me.txt"), "utf8") === "after\n");

  writeFileSync(join(ws, "patch-me.txt"), "before\n");
  const patch2 = stageWrite(run.id, "patch-me.txt", "rejected\n");
  const reject = spawnSync(
    process.execPath,
    [patchesCli, JSON.stringify({ workspace: ws, op: "reject", runId: run.id, patchId: patch2.id })],
    { encoding: "utf8" },
  );
  assert("patches CLI reject exit 0", reject.status === 0);
  assert("patches CLI reject keeps disk", readFileSync(join(ws, "patch-me.txt"), "utf8") === "before\n");
  assert("patches CLI reject status", reject.stdout.includes('"rejected"'));

  const getRun = spawnSync(
    process.execPath,
    [patchesCli, JSON.stringify({ workspace: ws, op: "get", runId: run.id })],
    { encoding: "utf8" },
  );
  assert("patches CLI get exit 0", getRun.status === 0);
  assert("patches CLI get run id", getRun.stdout.includes(run.id));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
