/**
 * Patch review CLI for desktop fork (list / accept / reject).
 * Usage: node dist/opencursor-patches.mjs '<json>'
 * { workspace, op: 'list'|'accept'|'reject'|'get'|'restore'|'reapply', runId?, patchId? }
 */
import {
  acceptPatch,
  getRun,
  listRunsSafe,
  reapplyRun,
  rejectPatch,
  restoreRun,
} from "@opencursor/agent-core/runs";
import { setWorkspace } from "@opencursor/agent-core/workspace";

type Payload = {
  workspace: string;
  op: "list" | "accept" | "reject" | "get" | "restore" | "reapply";
  runId?: string;
  patchId?: string;
};

const raw = process.argv[2];
if (!raw) {
  console.error("usage: opencursor-patches '{\"workspace\":\"...\",\"op\":\"list\"}'");
  process.exit(1);
}

const payload = JSON.parse(raw) as Payload;
if (!payload.workspace?.trim() || !payload.op) {
  console.error("workspace and op required");
  process.exit(1);
}

setWorkspace(payload.workspace);

let out: unknown;
switch (payload.op) {
  case "list":
    out = { runs: listRunsSafe() };
    break;
  case "get":
    if (!payload.runId) throw new Error("runId required");
    out = { run: getRun(payload.runId) };
    break;
  case "accept":
    if (!payload.runId || !payload.patchId) throw new Error("runId and patchId required");
    out = { patch: acceptPatch(payload.runId, payload.patchId) };
    break;
  case "reject":
    if (!payload.runId || !payload.patchId) throw new Error("runId and patchId required");
    out = { patch: rejectPatch(payload.runId, payload.patchId) };
    break;
  case "restore":
    if (!payload.runId) throw new Error("runId required");
    out = restoreRun(payload.runId);
    break;
  case "reapply":
    if (!payload.runId) throw new Error("runId required");
    out = reapplyRun(payload.runId);
    break;
  default:
    throw new Error(`unknown op`);
}

console.log(JSON.stringify(out));
