/**
 * Optional: map fork provider settings → OpenCursor data/config.json (BYOK).
 * Called from desktop bridge when Chat uses agent-core.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { workspace } from "./workspace.ts";
import type { AppConfig } from "./config.ts";

type DeepseekLike = { apiKey?: string; endpoint?: string };

export function syncDeepSeekConfigFromEnv(deepseek?: DeepseekLike): AppConfig | null {
  const apiKey = deepseek?.apiKey?.trim() || process.env.DEEPSEEK_API_KEY?.trim() || "";
  if (!apiKey) return null;

  const baseUrl = (deepseek?.endpoint?.trim() || "https://api.deepseek.com").replace(/\/$/, "");
  const cfg: AppConfig = {
    provider: "deepseek",
    baseUrl: baseUrl.includes("/v1") ? baseUrl : baseUrl,
    model: "deepseek-flash",
    apiKey,
    thinking: false,
  };

  const dir = join(workspace, "data");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "config.json");
  let existing: Partial<AppConfig> = {};
  if (existsSync(path)) {
    try {
      existing = JSON.parse(readFileSync(path, "utf8")) as Partial<AppConfig>;
    } catch {
      existing = {};
    }
  }
  if (!existing.apiKey) {
    writeFileSync(path, JSON.stringify({ ...existing, ...cfg }, null, 2));
  }
  return cfg;
}
