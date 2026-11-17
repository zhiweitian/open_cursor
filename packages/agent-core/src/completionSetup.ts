import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

export const LOCAL_COMPLETION_MODEL = "onnx-community/Qwen2.5-Coder-0.5B-Instruct";

export type CompletionSettings = {
  url: string;
  useLocal: boolean;
};

type ReadyFile = { model: string; installedAt: string };

let installerOverride: (() => Promise<string>) | null = null;
let completerOverride: ((prefix: string, suffix: string) => Promise<string>) | null = null;
let generator: ((prompt: string, opts: { max_new_tokens: number; do_sample: boolean }) => Promise<{ generated_text?: string }[]>) | null = null;

function settingsPath() {
  return join(workspace, "data", "completion.json");
}

function readyPath() {
  return join(workspace, "data", "models", "completion-ready.json");
}

export function loadCompletionSettings(): CompletionSettings {
  const path = settingsPath();
  if (!existsSync(path)) return { url: "", useLocal: false };
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<CompletionSettings>;
    return { url: String(raw.url || ""), useLocal: Boolean(raw.useLocal) };
  } catch {
    return { url: "", useLocal: false };
  }
}

export function saveCompletionSettings(patch: Partial<CompletionSettings>): CompletionSettings {
  const next = { ...loadCompletionSettings(), ...patch };
  mkdirSync(dirname(settingsPath()), { recursive: true });
  writeFileSync(settingsPath(), JSON.stringify({ url: next.url.trim(), useLocal: next.useLocal }, null, 2));
  return loadCompletionSettings();
}

export function completionUrl(): string {
  return loadCompletionSettings().url.trim() || process.env.OPENCURSOR_COMPLETE_URL?.trim() || "";
}

export function localCompletionReady(): boolean {
  return completerOverride !== null || existsSync(readyPath());
}

export function setCompletionInstallerForTests(fn: (() => Promise<string>) | null) {
  installerOverride = fn;
}

export function setInstalledCompleterForTests(fn: ((prefix: string, suffix: string) => Promise<string>) | null) {
  completerOverride = fn;
}

export async function installLocalCompletion(): Promise<string> {
  if (installerOverride) return installerOverride();
  if (!process.env.HF_HOME) process.env.HF_HOME = join(workspace, "data", "models");
  const { pipeline } = await import("@huggingface/transformers");
  generator = (await pipeline("text-generation", LOCAL_COMPLETION_MODEL, { dtype: "q4" })) as NonNullable<typeof generator>;
  const ready: ReadyFile = { model: LOCAL_COMPLETION_MODEL, installedAt: new Date().toISOString() };
  mkdirSync(dirname(readyPath()), { recursive: true });
  writeFileSync(readyPath(), JSON.stringify(ready, null, 2));
  saveCompletionSettings({ useLocal: true });
  return `已安装 ${LOCAL_COMPLETION_MODEL}`;
}

export async function completeWithInstalled(prefix: string, suffix: string): Promise<string> {
  if (completerOverride) return (await completerOverride(prefix, suffix)).slice(0, 200);
  if (!existsSync(readyPath())) return "";
  if (!generator) {
    if (!process.env.HF_HOME) process.env.HF_HOME = join(workspace, "data", "models");
    const { pipeline } = await import("@huggingface/transformers");
    generator = (await pipeline("text-generation", LOCAL_COMPLETION_MODEL, { dtype: "q4" })) as NonNullable<typeof generator>;
  }
  const prompt = `<|fim_prefix|>${prefix.slice(-2000)}<|fim_suffix|>${suffix.slice(0, 500)}<|fim_middle|>`;
  const out = await generator(prompt, { max_new_tokens: 24, do_sample: false });
  const text = out?.[0]?.generated_text || "";
  const middle = text.includes("<|fim_middle|>") ? text.split("<|fim_middle|>").pop() || "" : text.slice(prompt.length);
  return middle.replace(/<\|[^|]+?\|>/g, "").slice(0, 200);
}
