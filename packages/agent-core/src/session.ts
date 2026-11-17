import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
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

function readJson<T>(name: string): T | null {
  const path = join(workspace, "data", name);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

export function loadQuestion(): StagedQuestion | null {
  const q = readJson<StagedQuestion>("question.json");
  if (!q?.prompt || !Array.isArray(q.options)) return null;
  return q;
}

export function loadMode(): string {
  return readJson<{ mode?: string }>("mode.json")?.mode || "agent";
}

export function answerQuestion(optionId: string): string {
  const q = loadQuestion();
  if (!q) return "没有待回答的问题";
  const opt = q.options.find((o) => o.id === optionId);
  if (!opt) return "选项不存在";
  writeJson("answer.json", { prompt: q.prompt, optionId: opt.id, label: opt.label });
  const path = join(workspace, "data", "question.json");
  if (existsSync(path)) unlinkSync(path);
  return `已记录选择 ${opt.label}`;
}

export function sessionContext(): string {
  const answer = readJson<{ label?: string; optionId?: string }>("answer.json");
  if (!answer?.label) return "";
  return `\n用户刚才的选择：${answer.label}（${answer.optionId ?? ""}）。`;
}
