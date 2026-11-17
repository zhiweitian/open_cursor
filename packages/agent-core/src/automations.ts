import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

export type Automation = {
  id: string;
  prompt: string;
  everyMs: number;
  enabled: boolean;
  lastRun?: number;
};

const MIN_MS = 1_000;
const MAX_MS = 7 * 24 * 60 * 60 * 1000;

const path = () => join(workspace, "data", "automations.json");

function clean(items: Automation[]): Automation[] {
  const out: Automation[] = [];
  for (const item of items) {
    const id = item.id?.trim();
    const prompt = item.prompt?.trim();
    const everyMs = Math.floor(Number(item.everyMs));
    if (!id || !prompt || !Number.isFinite(everyMs) || everyMs < MIN_MS || everyMs > MAX_MS) continue;
    const next: Automation = { id, prompt, everyMs, enabled: item.enabled !== false };
    if (typeof item.lastRun === "number" && Number.isFinite(item.lastRun)) next.lastRun = item.lastRun;
    out.push(next);
  }
  return out;
}

export function loadAutomations(): Automation[] {
  const file = path();
  if (!existsSync(file)) return [];
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as { automations?: Automation[] };
    return clean(raw.automations ?? []);
  } catch {
    return [];
  }
}

export function saveAutomations(items: Automation[], merge = false): Automation[] {
  const incoming = clean(items);
  const list = merge ? mergeAutomations(loadAutomations(), incoming) : incoming;
  mkdirSync(dirname(path()), { recursive: true });
  writeFileSync(path(), JSON.stringify({ automations: list }, null, 2));
  return list;
}

function mergeAutomations(prev: Automation[], incoming: Automation[]) {
  const map = new Map(prev.map((item) => [item.id, item]));
  for (const item of incoming) {
    const old = map.get(item.id);
    map.set(item.id, { ...item, lastRun: item.lastRun ?? old?.lastRun });
  }
  return [...map.values()];
}

export function dueAutomations(now: number, list = loadAutomations()): Automation[] {
  return list.filter((item) => item.enabled && (item.lastRun == null || now - item.lastRun >= item.everyMs));
}

export function tickAutomations(now = Date.now()): Automation[] {
  const list = loadAutomations();
  const due = dueAutomations(now, list);
  const ids = new Set(due.map((item) => item.id));
  const next = list.map((item) => (ids.has(item.id) ? { ...item, lastRun: now } : item));
  mkdirSync(dirname(path()), { recursive: true });
  writeFileSync(path(), JSON.stringify({ automations: next }, null, 2));
  return due;
}
