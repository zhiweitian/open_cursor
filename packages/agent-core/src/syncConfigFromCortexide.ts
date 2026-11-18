/**
 * Optional: map fork provider settings → OpenCursor data/config.json (BYOK).
 * Called from desktop bridge when Chat uses agent-core.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { workspace } from "./workspace.ts";
import type { AppConfig } from "./config.ts";

type DeepseekLike = { apiKey?: string; endpoint?: string; model?: string };

export function syncDeepSeekConfigFromEnv(deepseek?: DeepseekLike): AppConfig | null {
  const path = join(workspace, "data", "config.json");
  let existing: Partial<AppConfig> = {};
  if (existsSync(path)) {
    try {
      existing = JSON.parse(readFileSync(path, "utf8")) as Partial<AppConfig>;
    } catch {
      existing = {};
    }
  }
  const apiKey = deepseek?.apiKey?.trim() || existing.apiKey || process.env.DEEPSEEK_API_KEY?.trim() || "";
  if (!apiKey) return null;

  const baseUrl = (deepseek?.endpoint?.trim() || existing.baseUrl || "https://api.deepseek.com").replace(/\/$/, "");
  const cfg: AppConfig = {
    provider: "deepseek",
    baseUrl,
    model: deepseek?.model?.trim() || existing.model || "deepseek-flash",
    apiKey,
    thinking: existing.thinking ?? false,
  };

  mkdirSync(join(workspace, "data"), { recursive: true });
  writeFileSync(path, JSON.stringify({ ...existing, ...cfg }, null, 2));
  return cfg;
}
