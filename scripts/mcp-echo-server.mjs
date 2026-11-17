import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "opencursor-echo", version: "0.0.1" });
server.registerTool("ping", { description: "returns pong" }, async () => ({
  content: [{ type: "text", text: "pong" }],
}));

await server.connect(new StdioServerTransport());
