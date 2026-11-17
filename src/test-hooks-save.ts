import { mkdirSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getHooksConfig, loadHooks, saveHooks, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-hooks-save-"));
setWorkspace(ws);
mkdirSync(join(ws, "data"), { recursive: true });

try {
  saveHooks({
    hooks: [
      { event: "preTool", command: "echo 1" },
      { event: "agentStop", command: "echo 2" },
      { event: "postTool", command: "" },
    ],
  });
  assert("persists valid", loadHooks().length === 2);
  assert("getHooksConfig", (getHooksConfig().hooks?.length ?? 0) === 2);
  const raw = JSON.parse(readFileSync(join(ws, "data", "hooks.json"), "utf8"));
  assert("written file", Array.isArray(raw.hooks) && raw.hooks.length === 2);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
