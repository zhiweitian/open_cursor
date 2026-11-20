/**
 * Patch review CLI for desktop fork (list / accept / reject).
 * Usage: node dist/opencursor-patches.mjs '<json>'
 * { workspace, op: 'list'|'accept'|'reject'|'get'|'restore'|'reapply'|'canvas'|'canvas-action', runId?, patchId?, action? }
 */
import { loadCanvas, recordCanvasAction } from "@opencursor/agent-core/canvas";
import { loadContextOff, setContextOff } from "../packages/agent-core/src/contextOff.ts";
import { embeddingStatus, refreshEmbeddings } from "../packages/agent-core/src/embeddings.ts";
import { loadFileIndex, refreshFileIndex } from "../packages/agent-core/src/fileIndex.ts";
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
  op: "list" | "accept" | "reject" | "get" | "restore" | "reapply" | "canvas" | "canvas-action" | "index" | "index-status" | "embed" | "embed-status" | "context" | "context-set";
  runId?: string;
  patchId?: string;
  action?: string;
  path?: string;
  enabled?: boolean;
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

async function runOp(): Promise<unknown> {
  switch (payload.op) {
    case "list":
      return { runs: listRunsSafe() };
    case "get":
      if (!payload.runId) throw new Error("runId required");
      return { run: getRun(payload.runId) };
    case "accept":
      if (!payload.runId || !payload.patchId) throw new Error("runId and patchId required");
      return { patch: acceptPatch(payload.runId, payload.patchId) };
    case "reject":
      if (!payload.runId || !payload.patchId) throw new Error("runId and patchId required");
      return { patch: rejectPatch(payload.runId, payload.patchId) };
    case "restore":
      if (!payload.runId) throw new Error("runId required");
      return restoreRun(payload.runId);
    case "reapply":
      if (!payload.runId) throw new Error("runId required");
      return reapplyRun(payload.runId);
    case "canvas":
      return { canvas: loadCanvas() };
    case "canvas-action":
      return { text: recordCanvasAction(payload.action || ""), canvas: loadCanvas() };
    case "index": {
      const index = refreshFileIndex();
      return { files: index.files.length, builtAt: index.builtAt };
    }
    case "index-status": {
      const index = loadFileIndex();
      return { files: index?.files.length ?? 0, builtAt: index?.builtAt ?? "" };
    }
    case "embed": {
      const built = await refreshEmbeddings();
      return { chunks: built.chunks, files: built.updated + built.reused, embedder: built.embedder, builtAt: built.builtAt };
    }
    case "embed-status":
      return embeddingStatus();
    case "context":
      return { off: loadContextOff() };
    case "context-set":
      if (!payload.path) throw new Error("path required");
      return { off: setContextOff(payload.path, payload.enabled !== false) };
    default:
      throw new Error(`unknown op`);
  }
}

console.log(JSON.stringify(await runOp()));
