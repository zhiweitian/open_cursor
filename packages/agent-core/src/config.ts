import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

export type Provider = "deepseek" | "openai" | "custom";

export type AppConfig = {
  provider: Provider;
  baseUrl: string;
  model: string;
  apiKey: string;
  thinking: boolean;
};

export const presets: Record<Exclude<Provider, "custom">, { baseUrl: string; models: string[] }> = {
  deepseek: { baseUrl: "https://api.deepseek.com", models: ["deepseek-flash", "deepseek-v4-pro"] },
  openai: { baseUrl: "https://api.openai.com/v1", models: ["gpt-4.1-mini", "gpt-4o"] },
};

let override: Partial<AppConfig> | null = null;

export function setConfigOverride(o: Partial<AppConfig> | null) {
  override = o;
}

const configPath = () => join(workspace, "data", "config.json");

function loadDotEnv() {
  const envPath = join(workspace, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i < 1 || line.startsWith("#")) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadDotEnv();

function fromEnv(): AppConfig {
  const key = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "";
  return {
    provider: "deepseek",
    baseUrl: process.env.OPENAI_BASE_URL || presets.deepseek.baseUrl,
    model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-flash",
    apiKey: key,
    thinking: false,
  };
}

export function getConfig(): AppConfig {
  let base: AppConfig;
  const path = configPath();
  if (!existsSync(path)) base = fromEnv();
  else base = { ...fromEnv(), ...(JSON.parse(readFileSync(path, "utf8")) as Partial<AppConfig>) };
  return override ? ({ ...base, ...override } as AppConfig) : base;
}

export function saveConfig(patch: Partial<AppConfig>): AppConfig {
  const cur = getConfig();
  const next: AppConfig = {
    ...cur,
    ...patch,
    apiKey: patch.apiKey && !patch.apiKey.includes("…") ? patch.apiKey : cur.apiKey,
  };
  mkdirSync(dirname(configPath()), { recursive: true });
  writeFileSync(configPath(), JSON.stringify(next, null, 2));
  override = null;
  return next;
}

export function publicConfig(c = getConfig()) {
  const k = c.apiKey;
  return {
    provider: c.provider,
    baseUrl: c.baseUrl,
    model: c.model,
    thinking: c.thinking,
    hasKey: Boolean(k),
    apiKeyMasked: k ? `${k.slice(0, 7)}…${k.slice(-4)}` : "",
    presets,
  };
}

export function chatUrl(c = getConfig()) {
  return `${c.baseUrl.replace(/\/$/, "")}/chat/completions`;
}

export function modelsUrl(c = getConfig()) {
  return `${c.baseUrl.replace(/\/$/, "")}/models`;
}
