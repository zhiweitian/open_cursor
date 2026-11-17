/**
 * Real npx MCP server. Skips when the registry cannot be reached.
 */
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

const ws = mkdtempSync(join(tmpdir(), "opencursor-mcp-npx-"));
setWorkspace(ws);

try {
  saveMcpConfig({
    servers: [
      {
        id: "everything",
        enabled: true,
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-everything"],
      },
    ],
  });
  const hub = new McpHub();
  try {
    await hub.connectAll();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/404|ENOTFOUND|EAI_AGAIN|getaddrinfo|Connection closed|timed out|ECONNRESET/.test(message)) {
      console.log("skip npx:", message);
      process.exit(0);
    }
    throw error;
  }
  const tools = hub.summary();
  assert("listed echo", tools.some((tool) => tool.tool === "echo" && tool.id === "mcp_everything__echo"));
  const text = await hub.call("mcp_everything__echo", { message: "hi" });
  assert("echo text", text.includes("Echo: hi"));
  await hub.closeAll();
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
