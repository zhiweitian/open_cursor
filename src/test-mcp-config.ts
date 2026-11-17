import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getMcpConfig, saveMcpConfig, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-mcp-"));
setWorkspace(ws);

try {
  const def = getMcpConfig();
  assert("default fetch server", def.servers.some((s) => s.id === "fetch" && s.enabled === false));

  mkdirSync(join(ws, "data"), { recursive: true });
  writeFileSync(
    join(ws, "data", "mcp.json"),
    JSON.stringify({ servers: [{ id: "custom", enabled: true, command: "echo", args: [] }] }),
  );
  const custom = getMcpConfig();
  assert("custom server id", custom.servers.some((s) => s.id === "custom"));

  saveMcpConfig({
    servers: [{ id: "saved", enabled: true, command: "node", args: ["-v"] }],
  });
  assert("saveMcpConfig roundtrip", getMcpConfig().servers.some((s) => s.id === "saved"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
