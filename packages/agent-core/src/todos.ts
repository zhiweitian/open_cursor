import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type TodoItem = {
  id: string;
  content: string;
  status: TodoStatus;
};

const STATUSES = new Set<TodoStatus>(["pending", "in_progress", "completed", "cancelled"]);

const todosPath = () => join(workspace, "data", "todos.json");

export function loadTodos(): TodoItem[] {
  const path = todosPath();
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { todos?: TodoItem[] };
    return (raw.todos ?? []).filter((t) => t.id && t.content && STATUSES.has(t.status));
  } catch {
    return [];
  }
}

export function saveTodos(items: TodoItem[], merge = false): TodoItem[] {
  const next = items.filter((t) => t.id && t.content && STATUSES.has(t.status));
  const list = merge ? mergeTodos(loadTodos(), next) : next;
  const path = todosPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ todos: list }, null, 2));
  return list;
}

function mergeTodos(prev: TodoItem[], incoming: TodoItem[]) {
  const map = new Map(prev.map((t) => [t.id, t]));
  for (const t of incoming) map.set(t.id, t);
  return [...map.values()];
}
