import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

export type AskOption = { id: string; label: string };

export type StagedQuestion = {
  prompt: string;
  options: AskOption[];
};

const MODES = new Set(["agent", "plan"]);

function writeJson(name: string, body: unknown) {
  const path = join(workspace, "data", name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(body, null, 2));
}

export function stageQuestion(prompt: string, options: AskOption[]): string {
  const clean = options.filter((o) => o.id?.trim() && o.label?.trim());
  if (!prompt.trim()) return "prompt 不能为空";
  if (clean.length < 2) return "至少需要两个选项";
  const question: StagedQuestion = { prompt: prompt.trim(), options: clean };
  writeJson("question.json", question);
  const lines = clean.map((o) => `- ${o.id}: ${o.label}`).join("\n");
  return `已向用户提问，等待选择。\n${question.prompt}\n${lines}`;
}

export function switchMode(mode: string): string {
  if (!MODES.has(mode)) return "mode 只能是 agent 或 plan";
  writeJson("mode.json", { mode });
  return `当前模式：${mode}`;
}
