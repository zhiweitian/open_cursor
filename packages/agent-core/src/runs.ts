import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { unifiedDiff } from "./diff.ts";
import { workspace } from "./workspace.ts";

export type Patch = {
  id: string;
  path: string;
  oldContent: string;
  newContent: string;
  diff: string;
  status: "pending" | "accepted" | "rejected";
};

export type Run = {
  id: string;
  createdAt: string;
  snapshot: Record<string, string | null>;
  patches: Patch[];
};

const runsDir = () => join(workspace, "data", "runs");

function pathOf(id: string) {
  return join(runsDir(), `${id}.json`);
}

function load(id: string): Run {
  return JSON.parse(readFileSync(pathOf(id), "utf8")) as Run;
}

function save(run: Run) {
  mkdirSync(dirname(pathOf(run.id)), { recursive: true });
  writeFileSync(pathOf(run.id), JSON.stringify(run, null, 2));
}

export function createRun(): Run {
  const run: Run = { id: randomUUID(), createdAt: new Date().toISOString(), snapshot: {}, patches: [] };
  save(run);
  return run;
}

export function getRun(id: string) {
  if (!existsSync(pathOf(id))) throw new Error("run 不存在");
  return load(id);
}

export function listRunsSafe() {
  const dir = runsDir();
  mkdirSync(dir, { recursive: true });
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const r = load(f.replace(/\.json$/, ""));
      return { id: r.id, createdAt: r.createdAt, pending: r.patches.filter((p) => p.status === "pending").length };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function stageWrite(runId: string, rel: string, newContent: string): Patch {
  const run = getRun(runId);
  const abs = join(workspace, rel);
  const oldContent = existsSync(abs) ? readFileSync(abs, "utf8") : "";
  const existed = existsSync(abs);
  const patch: Patch = {
    id: randomUUID(),
    path: rel,
    oldContent,
    newContent,
    diff: unifiedDiff(rel, oldContent, newContent),
    status: "pending",
  };
  run.patches.push(patch);
  if (!(rel in run.snapshot)) run.snapshot[rel] = existed ? oldContent : null;
  save(run);
  return patch;
}

export function acceptPatch(runId: string, patchId: string) {
  const run = getRun(runId);
  const p = run.patches.find((x) => x.id === patchId);
  if (!p || p.status !== "pending") throw new Error("补丁不可用");
  const abs = join(workspace, p.path);
  if (p.newContent === "" && existsSync(abs)) {
    unlinkSync(abs);
  } else {
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, p.newContent);
  }
  p.status = "accepted";
  save(run);
  return p;
}

export function rejectPatch(runId: string, patchId: string) {
  const run = getRun(runId);
  const p = run.patches.find((x) => x.id === patchId);
  if (!p || p.status !== "pending") throw new Error("补丁不可用");
  p.status = "rejected";
  save(run);
  return p;
}

export function restoreRun(runId: string) {
  const run = getRun(runId);
  for (const [rel, content] of Object.entries(run.snapshot)) {
    const abs = join(workspace, rel);
    if (content === null) {
      if (existsSync(abs)) unlinkSync(abs);
    } else {
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, content);
    }
  }
  for (const p of run.patches) {
    if (p.status === "pending") p.status = "rejected";
  }
  save(run);
  return { restored: Object.keys(run.snapshot).length };
}

export function applyWriteImmediate(runId: string | undefined, rel: string, newContent: string) {
  if (runId) {
    const run = getRun(runId);
    const abs = join(workspace, rel);
    if (!(rel in run.snapshot)) {
      run.snapshot[rel] = existsSync(abs) ? readFileSync(abs, "utf8") : null;
      save(run);
    }
  }
  mkdirSync(dirname(join(workspace, rel)), { recursive: true });
  writeFileSync(join(workspace, rel), newContent);
}
