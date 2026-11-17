import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { workspace } from "./workspace.ts";

export type CanvasBlock = Record<string, unknown> & { type: string };

export type CanvasDoc = {
  title: string;
  blocks: CanvasBlock[];
  lastAction: string;
};

const TYPES = new Set([
  "h1",
  "h2",
  "h3",
  "text",
  "stat",
  "callout",
  "table",
  "timeline",
  "bars",
  "pills",
  "diff",
  "todos",
  "divider",
  "button",
]);

function canvasPath() {
  return join(workspace, "data", "canvas.json");
}

function text(value: unknown, max = 400) {
  return String(value ?? "").slice(0, max);
}

function cleanBlock(raw: unknown): CanvasBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const block = raw as Record<string, unknown>;
  const type = text(block.type, 20);
  if (!TYPES.has(type)) return null;
  if (type === "divider") return { type };
  if (type === "h1" || type === "h2" || type === "h3" || type === "text") {
    return { type, text: text(block.text) };
  }
  if (type === "stat") {
    return { type, label: text(block.label, 80), value: text(block.value, 80), tone: text(block.tone, 20) };
  }
  if (type === "callout") {
    return { type, tone: text(block.tone, 20), title: text(block.title, 120), text: text(block.text) };
  }
  if (type === "button") {
    return { type, label: text(block.label, 80), action: text(block.action, 120) };
  }
  if (type === "table") {
    const headers = Array.isArray(block.headers) ? block.headers.slice(0, 8).map((cell) => text(cell, 80)) : [];
    const rows = Array.isArray(block.rows)
      ? block.rows.slice(0, 40).map((row) => (Array.isArray(row) ? row.slice(0, 8).map((cell) => text(cell, 200)) : []))
      : [];
    const rowTone = Array.isArray(block.rowTone) ? block.rowTone.slice(0, 40).map((tone) => text(tone, 20)) : [];
    return { type, headers, rows, rowTone };
  }
  if (type === "timeline" || type === "todos") {
    const items = Array.isArray(block.items)
      ? block.items.slice(0, 30).map((item) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return {
            title: text(row.title || row.content, 160),
            detail: text(row.detail, 240),
            time: text(row.time, 40),
            status: text(row.status, 20),
          };
        })
      : [];
    return { type, items };
  }
  if (type === "bars") {
    const points = Array.isArray(block.points)
      ? block.points.slice(0, 12).map((item) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          const value = Number(row.value);
          return { label: text(row.label, 40), value: Number.isFinite(value) ? value : 0 };
        })
      : [];
    return { type, title: text(block.title, 120), unit: text(block.unit, 20), points };
  }
  if (type === "pills") {
    const items = Array.isArray(block.items)
      ? block.items.slice(0, 16).map((item) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          return { text: text(row.text, 40), tone: text(row.tone, 20) };
        })
      : [];
    return { type, items };
  }
  if (type === "diff") {
    const lines = Array.isArray(block.lines)
      ? block.lines.slice(0, 80).map((item) => {
          const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
          const kind = text(row.kind, 8);
          return { kind: kind === "add" || kind === "del" ? kind : "ctx", text: text(row.text, 200) };
        })
      : [];
    return { type, path: text(block.path, 160), lines };
  }
  return null;
}

export function loadCanvas(): CanvasDoc | null {
  const path = canvasPath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as CanvasDoc;
    if (!raw.title?.trim() || !Array.isArray(raw.blocks)) return null;
    return { title: raw.title, blocks: raw.blocks, lastAction: raw.lastAction || "" };
  } catch {
    return null;
  }
}

function save(doc: CanvasDoc) {
  mkdirSync(dirname(canvasPath()), { recursive: true });
  writeFileSync(canvasPath(), JSON.stringify(doc, null, 2));
}

export function writeCanvas(title: string, blocks: unknown[]): string {
  const cleanTitle = title.trim().slice(0, 120);
  if (!cleanTitle) return "标题不能为空";
  if (!Array.isArray(blocks)) return "blocks 需要是数组";
  const kept = blocks.map(cleanBlock).filter((block): block is CanvasBlock => block !== null).slice(0, 40);
  if (!kept.length) return "没有可显示的块";
  save({ title: cleanTitle, blocks: kept, lastAction: "" });
  return `已打开 Canvas：${cleanTitle}（${kept.length} 块）`;
}

export function recordCanvasAction(action: string): string {
  const doc = loadCanvas();
  if (!doc) return "还没有 Canvas";
  doc.lastAction = action.trim().slice(0, 120);
  if (!doc.lastAction) return "action 不能为空";
  save(doc);
  return `已记录 ${doc.lastAction}`;
}

export function canvasContext(): string {
  const doc = loadCanvas();
  if (!doc) return "";
  const action = doc.lastAction ? ` 用户刚点了：${doc.lastAction}。` : "";
  return `\n当前 Canvas：${doc.title}。${action}`.trimEnd();
}
