import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acceptPatch,
  applyWriteImmediate,
  createRun,
  listRunsSafe,
  rejectPatch,
  reapplyRun,
  restoreRun,
  setWorkspace,
  stageWrite,
  syncDeepSeekConfigFromEnv,
} from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-patch-"));
setWorkspace(ws);

try {
  const run = createRun();
  const rel = "hello.txt";
  writeFileSync(join(ws, rel), "old\n");
  const patch = stageWrite(run.id, rel, "new\n");
  assert("stageWrite pending", patch.status === "pending");
  assert("listRunsSafe pending count", listRunsSafe().some((r) => r.id === run.id && r.pending === 1));

  acceptPatch(run.id, patch.id);
  assert("accept writes file", readFileSync(join(ws, rel), "utf8") === "new\n");

  const run2 = createRun();
  const p2 = stageWrite(run2.id, "del.txt", "");
  writeFileSync(join(ws, "del.txt"), "x");
  rejectPatch(run2.id, p2.id);
  assert("reject keeps file", readFileSync(join(ws, "del.txt"), "utf8") === "x");

  mkdirSync(join(ws, "data"), { recursive: true });
  writeFileSync(join(ws, "data", "config.json"), JSON.stringify({ apiKey: "existing" }));
  syncDeepSeekConfigFromEnv({ apiKey: "from-sync", model: "m1" });
  const cfg = JSON.parse(readFileSync(join(ws, "data", "config.json"), "utf8")) as { apiKey: string; model: string };
  assert("syncDeepSeek writes the key from the desktop", cfg.apiKey === "from-sync" && cfg.model === "m1");

  rmSync(join(ws, "data", "config.json"));
  syncDeepSeekConfigFromEnv({ apiKey: "new-key" });
  const cfg2 = JSON.parse(readFileSync(join(ws, "data", "config.json"), "utf8")) as { apiKey: string };
  assert("syncDeepSeek writes when missing", cfg2.apiKey === "new-key");

  const run3 = createRun();
  writeFileSync(join(ws, "snap.txt"), "v1\n");
  applyWriteImmediate(run3.id, "snap.txt", "v2\n");
  applyWriteImmediate(run3.id, "new.txt", "n\n");
  restoreRun(run3.id);
  assert("restore snap", readFileSync(join(ws, "snap.txt"), "utf8") === "v1\n");
  assert("restore removes new file", !existsSync(join(ws, "new.txt")));
  reapplyRun(run3.id);
  assert("reapply snap", readFileSync(join(ws, "snap.txt"), "utf8") === "v2\n");
  assert("reapply new file", readFileSync(join(ws, "new.txt"), "utf8") === "n\n");
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
