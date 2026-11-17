import { mkdtempSync, rmSync } from "node:fs";
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

const ws = mkdtempSync(join(tmpdir(), "opencursor-mcp-live-"));
setWorkspace(ws);
const script = join(import.meta.dirname, "..", "scripts", "mcp-echo-server.mjs");

try {
  saveMcpConfig({
    servers: [{ id: "echo", enabled: true, command: process.execPath, args: [script] }],
  });
  const hub = new McpHub();
  await hub.connectAll();
  const tools = hub.summary();
  assert("listed ping", tools.some((t) => t.tool === "ping" && t.id === "mcp_echo__ping"));
  const text = await hub.call("mcp_echo__ping", {});
  assert("called ping", text.includes("pong"));
  await hub.closeAll();
  assert("closed", hub.summary().length === 0);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
