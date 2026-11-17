import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptPatch,
  applyWriteImmediate,
  buildTree,
  createRun,
  getConfig,
  getMcpConfig,
  getRun,
  inside,
  listRules,
  listRunsSafe,
  listSkills,
  getHooksConfig,
  saveHooks,
  McpHub,
  modelsUrl,
  pingModel,
  publicConfig,
  rejectPatch,
  restoreRun,
  reapplyRun,
  runAgent,
  saveConfig,
  saveMcpConfig,
  stageWrite,
  workspace,
  applyCliMockLlm,
  completeText,
  installLocalCompletion,
  loadCompletionSettings,
  localCompletionReady,
  saveCompletionSettings,
  LOCAL_COMPLETION_MODEL,
  listSymbols,
  loadQuestion,
  loadMode,
  loadGoal,
  loadCanvas,
  writeCanvas,
  recordCanvasAction,
  loadSelection,
  setSelection,
  clearSelection,
  loadOpenFile,
  setOpenFile,
  loadAutomations,
  tickAutomations,
  runDueAutomations,
  loadTodos,
  setTodoStatus,
  answerQuestion,
} from "@opencursor/agent-core";

applyCliMockLlm();

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function webDir() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  if (existsSync(join(root, "web"))) return join(root, "web");
  if (existsSync(join(root, "dist", "web"))) return join(root, "dist", "web");
  return join(workspace, "web");
}
const web = webDir();
const port = Number(process.env.PORT || 3847);

function send(res: import("node:http").ServerResponse, code: number, body: unknown, type = "application/json") {
  const data =
    typeof body === "string" ? body : Buffer.isBuffer(body) ? body.toString("utf8") : JSON.stringify(body);
  res.writeHead(code, { "content-type": type });
  res.end(data);
}

async function readBody(req: import("node:http").IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString();
  return raw ? JSON.parse(raw) : {};
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/config") return send(res, 200, publicConfig());
    if (req.method === "POST" && url.pathname === "/api/config") {
      saveConfig(await readBody(req));
      return send(res, 200, publicConfig());
    }
    if (req.method === "POST" && url.pathname === "/api/test") {
      return send(res, 200, { ok: true, text: await pingModel() });
    }
    if (req.method === "GET" && url.pathname === "/api/models") {
      const c = getConfig();
      const r = await fetch(modelsUrl(c), { headers: { authorization: `Bearer ${c.apiKey}` } });
      return send(res, r.ok ? 200 : r.status, await r.json());
    }
    if (req.method === "GET" && url.pathname === "/api/tree") return send(res, 200, { tree: buildTree() });
    if (req.method === "GET" && url.pathname === "/api/skills") return send(res, 200, { skills: listSkills() });
    if (req.method === "GET" && url.pathname === "/api/rules") return send(res, 200, { rules: listRules() });
    if (req.method === "GET" && url.pathname === "/api/mcp") return send(res, 200, getMcpConfig());
    if (req.method === "POST" && url.pathname === "/api/mcp") {
      saveMcpConfig(await readBody(req));
      return send(res, 200, getMcpConfig());
    }
    if (req.method === "GET" && url.pathname === "/api/hooks") return send(res, 200, getHooksConfig());
    if (req.method === "POST" && url.pathname === "/api/hooks") {
      saveHooks(await readBody(req));
      return send(res, 200, getHooksConfig());
    }
    if (req.method === "POST" && url.pathname === "/api/mcp/probe") {
      const hub = new McpHub();
      try {
        await hub.connectAll();
        return send(res, 200, { ok: true, tools: hub.summary() });
      } finally {
        await hub.closeAll();
      }
    }
    if (req.method === "GET" && url.pathname === "/api/runs") return send(res, 200, { runs: listRunsSafe() });
    const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (req.method === "GET" && runMatch) return send(res, 200, getRun(runMatch[1]));
    const restoreMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/restore$/);
    if (req.method === "POST" && restoreMatch) return send(res, 200, restoreRun(restoreMatch[1]));
    const reapplyMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/reapply$/);
    if (req.method === "POST" && reapplyMatch) return send(res, 200, reapplyRun(reapplyMatch[1]));
    const acceptMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/patches\/([^/]+)\/accept$/);
    if (req.method === "POST" && acceptMatch) return send(res, 200, acceptPatch(acceptMatch[1], acceptMatch[2]));
    const rejectMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/patches\/([^/]+)\/reject$/);
    if (req.method === "POST" && rejectMatch) return send(res, 200, rejectPatch(rejectMatch[1], rejectMatch[2]));
    if (req.method === "GET" && url.pathname === "/api/file") {
      const p = url.searchParams.get("path");
      if (!p) return send(res, 400, { error: "缺少 path" });
      return send(res, 200, { path: p, content: readFileSync(inside(p), "utf8") });
    }
    if (req.method === "POST" && url.pathname === "/api/file") {
      const body = await readBody(req);
      const rel = String(body.path || "");
      const content = String(body.content ?? "");
      const pathRel = relative(workspace, inside(rel));
      const run = createRun();
      if (body.reviewWrites) {
        const patch = stageWrite(run.id, pathRel, content);
        return send(res, 200, { ok: true, runId: run.id, patchId: patch.id, review: true });
      }
      applyWriteImmediate(run.id, pathRel, content);
      return send(res, 200, { ok: true, runId: run.id });
    }
    if (req.method === "GET" && url.pathname === "/api/canvas") {
      return send(res, 200, { canvas: loadCanvas() });
    }
    if (req.method === "POST" && url.pathname === "/api/canvas") {
      const body = await readBody(req);
      const blocks = Array.isArray(body.blocks) ? body.blocks : [];
      const text = writeCanvas(String(body.title || ""), blocks);
      return send(res, 200, { ok: text.startsWith("已打开"), text, canvas: loadCanvas() });
    }
    if (req.method === "POST" && url.pathname === "/api/canvas/action") {
      const body = await readBody(req);
      const text = recordCanvasAction(String(body.action || ""));
      return send(res, 200, { ok: text.startsWith("已记录"), text, canvas: loadCanvas() });
    }
    if (req.method === "GET" && url.pathname === "/api/todos") {
      return send(res, 200, { todos: loadTodos() });
    }
    if (req.method === "POST" && url.pathname === "/api/todos/status") {
      const body = await readBody(req);
      const text = setTodoStatus(String(body.id || ""), String(body.status || ""));
      return send(res, 200, { ok: text.startsWith("已更新"), text, todos: loadTodos() });
    }
    if (req.method === "GET" && url.pathname === "/api/automations") {
      return send(res, 200, { automations: loadAutomations() });
    }
    if (req.method === "POST" && url.pathname === "/api/automations/tick") {
      const body = await readBody(req);
      const now = Number(body.now);
      const due = tickAutomations(Number.isFinite(now) ? now : Date.now());
      return send(res, 200, {
        due: due.map((item) => ({ id: item.id, prompt: item.prompt })),
        automations: loadAutomations(),
      });
    }
    if (req.method === "POST" && url.pathname === "/api/automations/run") {
      const body = await readBody(req);
      const now = Number(body.now);
      const runs = await runDueAutomations(Number.isFinite(now) ? now : Date.now());
      return send(res, 200, { runs, automations: loadAutomations() });
    }
    if (req.method === "GET" && url.pathname === "/api/session") {
      return send(res, 200, {
        mode: loadMode(),
        question: loadQuestion(),
        goal: loadGoal(),
        selection: loadSelection(),
        openFile: loadOpenFile(),
      });
    }
    if (req.method === "POST" && url.pathname === "/api/session/answer") {
      const body = await readBody(req);
      const text = answerQuestion(String(body.optionId || ""));
      return send(res, 200, { ok: !text.startsWith("没有") && !text.startsWith("选项"), text, question: loadQuestion() });
    }
    if (req.method === "POST" && url.pathname === "/api/open-file") {
      const body = await readBody(req);
      const rel = relative(workspace, inside(String(body.path || "")));
      const text = setOpenFile(rel);
      return send(res, 200, { ok: text.startsWith("正在编辑"), text, openFile: loadOpenFile() });
    }
    if (req.method === "GET" && url.pathname === "/api/symbols") {
      const p = url.searchParams.get("path");
      if (!p) return send(res, 400, { error: "缺少 path" });
      return send(res, 200, { path: p, symbols: listSymbols(readFileSync(inside(p), "utf8")) });
    }
    if (req.method === "POST" && url.pathname === "/api/selection") {
      const body = await readBody(req);
      if (body.clear) {
        clearSelection();
        return send(res, 200, { ok: true, text: "已清除选区", selection: null });
      }
      const rel = relative(workspace, inside(String(body.path || "")));
      const text = setSelection({
        path: rel,
        startLine: Number(body.startLine),
        endLine: Number(body.endLine),
        text: String(body.text ?? ""),
      });
      const selection = loadSelection();
      return send(res, 200, { ok: Boolean(selection), text, selection });
    }
    if (req.method === "GET" && url.pathname === "/api/completion") {
      const settings = loadCompletionSettings();
      return send(res, 200, { ...settings, ready: localCompletionReady(), model: LOCAL_COMPLETION_MODEL });
    }
    if (req.method === "POST" && url.pathname === "/api/completion") {
      const body = await readBody(req);
      const settings = saveCompletionSettings({
        url: String(body.url ?? loadCompletionSettings().url),
        useLocal: body.useLocal === undefined ? loadCompletionSettings().useLocal : Boolean(body.useLocal),
      });
      return send(res, 200, { ...settings, ready: localCompletionReady(), model: LOCAL_COMPLETION_MODEL });
    }
    if (req.method === "POST" && url.pathname === "/api/completion/install") {
      try {
        const text = await installLocalCompletion();
        const settings = loadCompletionSettings();
        return send(res, 200, { ok: true, text, ...settings, ready: localCompletionReady(), model: LOCAL_COMPLETION_MODEL });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return send(res, 200, { ok: false, text: message, ready: localCompletionReady() });
      }
    }
    if (req.method === "POST" && url.pathname === "/api/complete") {
      const body = await readBody(req);
      const text = String(body.text ?? "");
      const cursor = Number(body.cursor ?? text.length);
      const out = await completeText(text, Number.isFinite(cursor) ? cursor : text.length);
      return send(res, 200, out);
    }
    if (req.method === "POST" && url.pathname === "/api/chat") {
      const body = await readBody(req);
      const run = createRun();
      const out = await runAgent(String(body.message || ""), {
        runId: run.id,
        reviewWrites: body.reviewWrites !== false,
        allowDangerousShell: Boolean(body.allowDangerousShell),
        useMcp: body.useMcp !== false,
      });
      return send(res, 200, { ...out, runId: run.id });
    }
    let file = url.pathname === "/" ? "/index.html" : url.pathname;
    if (file === "/config") file = "/config.html";
    if (file === "/editor") file = "/editor.html";
    const abs = join(web, file);
    if (!abs.startsWith(web)) return send(res, 403, "forbidden", "text/plain");
    return send(res, 200, readFileSync(abs, "utf8"), types[extname(abs)] || "text/plain");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("ENOENT")) return send(res, 404, "not found", "text/plain");
    return send(res, 500, { error: msg });
  }
});

server.listen(port, () => {
  console.log(`OpenCursor Web  http://127.0.0.1:${port}`);
});
