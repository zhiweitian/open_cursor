/**
 * Agent hooks. Config: `data/hooks.json` or `.cursor/hooks.json`
 * { "hooks": [ { "event": "preTool", "command": "..." } ] }
 * Env passed to command: OPENCURSOR_HOOK_EVENT, OPENCURSOR_HOOK_TOOL, OPENCURSOR_HOOK_ARGS, OPENCURSOR_HOOK_ERROR
 * Set OPENCURSOR_HOOKS_DRY=1 to skip execution (tests).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { workspace } from "./workspace.ts";

export type HookEvent = "preTool" | "postTool" | "agentStop";

export type HookDef = {
  event: HookEvent;
  command: string;
};

export type HooksFile = {
  hooks?: HookDef[];
};

const hooksDataPath = () => join(workspace, "data", "hooks.json");
const HOOK_FILES = () => [hooksDataPath(), join(workspace, ".cursor", "hooks.json")];

const VALID_EVENTS = new Set<HookEvent>(["preTool", "postTool", "agentStop"]);

export function getHooksConfig(): HooksFile {
  return { hooks: loadHooks() };
}

export function saveHooks(file: HooksFile) {
  const path = hooksDataPath();
  mkdirSync(dirname(path), { recursive: true });
  const list = (file.hooks ?? []).filter(
    (h) => VALID_EVENTS.has(h.event) && typeof h.command === "string" && h.command.trim(),
  );
  writeFileSync(path, JSON.stringify({ hooks: list }, null, 2));
}

export function loadHooks(): HookDef[] {
  for (const path of HOOK_FILES()) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as HooksFile;
      const list = raw.hooks ?? [];
      return list.filter((h) => VALID_EVENTS.has(h.event) && typeof h.command === "string" && h.command.trim());
    } catch {
      return [];
    }
  }
  return [];
}

export type HookContext = {
  tool?: string;
  args?: Record<string, string>;
  error?: string;
};

const HOOK_TIMEOUT_MS = 5000;

function runHookCommand(command: string, event: HookEvent, ctx: HookContext) {
  const env = {
    ...process.env,
    OPENCURSOR_HOOK_EVENT: event,
    OPENCURSOR_HOOK_TOOL: ctx.tool ?? "",
    OPENCURSOR_HOOK_ERROR: ctx.error ?? "",
    OPENCURSOR_HOOK_ARGS: JSON.stringify(ctx.args ?? {}),
  };
  spawnSync("bash", ["-lc", command], {
    cwd: workspace,
    env,
    encoding: "utf8",
    timeout: HOOK_TIMEOUT_MS,
    maxBuffer: 64_000,
  });
}

export async function fireHooks(event: HookEvent, ctx: HookContext = {}): Promise<void> {
  if (process.env.OPENCURSOR_HOOKS_DRY === "1") return;
  const hooks = loadHooks().filter((h) => h.event === event);
  for (const h of hooks) {
    try {
      runHookCommand(h.command, event, ctx);
    } catch {
      /* hooks must not break the agent */
    }
  }
}
