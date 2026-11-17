import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { McpHub, saveMcpConfig, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-mcp-hub-"));
setWorkspace(ws);

try {
  mkdirSync(join(ws, "data"), { recursive: true });
  saveMcpConfig({
    servers: [
      { id: "disabled", enabled: false, command: "npx", args: ["-y", "noop"] },
    ],
  });
  const hub = new McpHub();
  await hub.connectAll();
  assert("connectAll skips disabled", hub.summary().length === 0);
  await hub.closeAll();
  assert("closeAll ok", true);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
