import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { workspace } from "./workspace.ts";

export type McpServerConfig = {
  id: string;
  enabled?: boolean;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
};

export type McpFile = { servers: McpServerConfig[] };

const mcpConfigPath = () => join(workspace, "data", "mcp.json");

const defaultMcp: McpFile = {
  servers: [
    {
      id: "fetch",
      enabled: false,
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-fetch"],
    },
  ],
};

export function getMcpConfig(): McpFile {
  const path = mcpConfigPath();
  if (!existsSync(path)) return defaultMcp;
  return { ...defaultMcp, ...JSON.parse(readFileSync(path, "utf8")) };
}

export function saveMcpConfig(cfg: McpFile) {
  const path = mcpConfigPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(cfg, null, 2));
}

type Registered = {
  serverId: string;
  toolName: string;
  openAiName: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

function openAiName(serverId: string, toolName: string) {
  return `mcp_${serverId}__${toolName.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

export class McpHub {
  private clients = new Map<string, Client>();
  private registry: Registered[] = [];

  async connectAll() {
    const cfg = getMcpConfig();
    for (const s of cfg.servers) {
      if (s.enabled === false) continue;
      const transport = new StdioClientTransport({
        command: s.command,
        args: s.args,
        env: s.env,
        cwd: s.cwd || workspace,
        stderr: "pipe",
      });
      const client = new Client({ name: "opencursor", version: "0.1.0" });
      await client.connect(transport);
      this.clients.set(s.id, client);
      const tools = await client.listTools();
      for (const t of tools.tools) {
        this.registry.push({
          serverId: s.id,
          toolName: t.name,
          openAiName: openAiName(s.id, t.name),
          description: t.description || t.name,
          inputSchema: (t.inputSchema as Record<string, unknown>) || { type: "object", properties: {} },
        });
      }
    }
  }

  openAiTools() {
    return this.registry.map((r) => ({
      type: "function" as const,
      function: {
        name: r.openAiName,
        description: `[MCP:${r.serverId}] ${r.description}`,
        parameters: r.inputSchema,
      },
    }));
  }

  async call(openAiToolName: string, args: Record<string, unknown>) {
    const r = this.registry.find((x) => x.openAiName === openAiToolName);
    if (!r) throw new Error("未知 MCP 工具");
    const client = this.clients.get(r.serverId);
    if (!client) throw new Error("MCP 未连接");
    const result = await client.callTool({ name: r.toolName, arguments: args });
    const text = (result.content as { type: string; text?: string }[])
      ?.map((c) => (c.type === "text" ? c.text : JSON.stringify(c)))
      .join("\n");
    return text || JSON.stringify(result);
  }

  summary() {
    return this.registry.map((r) => ({ server: r.serverId, tool: r.toolName, id: r.openAiName }));
  }

  async closeAll() {
    for (const c of this.clients.values()) {
      try {
        await c.close();
      } catch {}
    }
    this.clients.clear();
    this.registry = [];
  }
}
