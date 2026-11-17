import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

export type GoalStatus = "active" | "done" | "cancelled";

export type Goal = {
  title: string;
  status: GoalStatus;
  note: string;
};

const STATUSES = new Set<GoalStatus>(["active", "done", "cancelled"]);

function goalPath() {
  return join(workspace, "data", "goal.json");
}

export function loadGoal(): Goal | null {
  const path = goalPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Goal;
    if (!raw.title?.trim() || !STATUSES.has(raw.status)) return null;
    return { title: raw.title.trim(), status: raw.status, note: raw.note || "" };
  } catch {
    return null;
  }
}

export function setGoal(title: string, note = ""): string {
  const clean = title.trim();
  if (!clean) return "目标不能为空";
  const goal: Goal = { title: clean, status: "active", note: note.trim() };
  mkdirSync(dirname(goalPath()), { recursive: true });
  writeFileSync(goalPath(), JSON.stringify(goal, null, 2));
  return `当前目标：${goal.title}`;
}

export function updateGoal(status: string, note?: string): string {
  const goal = loadGoal();
  if (!goal) return "还没有目标";
  if (!STATUSES.has(status as GoalStatus)) return "status 只能是 active、done 或 cancelled";
  goal.status = status as GoalStatus;
  if (note !== undefined) goal.note = note.trim();
  writeFileSync(goalPath(), JSON.stringify(goal, null, 2));
  return `目标已更新：${goal.title}（${goal.status}）`;
}

export function goalContext(): string {
  const goal = loadGoal();
  if (!goal) return "";
  const note = goal.note ? ` ${goal.note}` : "";
  return `\n当前目标：${goal.title}（${goal.status}）。${note}`.trimEnd();
}
