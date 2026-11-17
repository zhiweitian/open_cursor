/**
 * Smoke HTTP routes (no API key): spawn server on ephemeral port.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";

let ok = 0;
let fail = 0;
function assert(name: string, cond: boolean) {
  if (cond) {
    ok++;
    console.log("✓", name);
  } else {
    fail++;
    console.log("✗", name);
  }
}

const port = 38000 + Math.floor(Math.random() * 2000);
const root = join(import.meta.dirname, "..");

async function get(path: string): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { status: res.status, json };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let child: ChildProcess | undefined;

try {
  child = spawn(process.execPath, ["--import", "tsx", join(root, "src/server.ts")], {
    env: { ...process.env, PORT: String(port) },
    cwd: root,
    stdio: "ignore",
  });

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const r = await get("/api/tree");
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* server starting */
    }
    await sleep(200);
  }
  assert("server started", ready);

  if (ready) {
    const tree = await get("/api/tree");
    assert("GET /api/tree", tree.status === 200 && Array.isArray((tree.json as { tree?: unknown }).tree));

    const cfg = await get("/api/config");
    assert("GET /api/config", cfg.status === 200);

    const skills = await get("/api/skills");
    assert("GET /api/skills", skills.status === 200);

    const index = await fetch(`http://127.0.0.1:${port}/`);
    assert("GET /", index.status === 200);

    const runs = await get("/api/runs");
    assert("GET /api/runs", runs.status === 200 && Array.isArray((runs.json as { runs?: unknown }).runs));

    const rules = await get("/api/rules");
    assert("GET /api/rules", rules.status === 200);

    const fileGet = await get("/api/file?path=package.json");
    assert(
      "GET /api/file",
      fileGet.status === 200 && String((fileGet.json as { content?: string }).content).includes("opencursor-monorepo"),
    );

    const mcpGet = await get("/api/mcp");
    assert("GET /api/mcp", mcpGet.status === 200 && (mcpGet.json as { servers?: unknown }).servers !== undefined);

    const hooksGet = await get("/api/hooks");
    assert("GET /api/hooks", hooksGet.status === 200 && Array.isArray((hooksGet.json as { hooks?: unknown }).hooks));

    const hooksPost = await fetch(`http://127.0.0.1:${port}/api/hooks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hooks: [{ event: "agentStop", command: "true" }] }),
    });
    const hooksBody = (await hooksPost.json()) as { hooks?: { event: string }[] };
    assert("POST /api/hooks", hooksPost.status === 200 && hooksBody.hooks?.[0]?.event === "agentStop");

    const complete = await fetch(`http://127.0.0.1:${port}/api/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "function helloWorld() {}\nhello" }),
    });
    const cj = (await complete.json()) as { completion?: string };
    assert("POST /api/complete", complete.status === 200 && cj.completion === "World");

    const symbols = await get("/api/symbols?path=packages/agent-core/src/symbols.ts");
    const names = ((symbols.json as { symbols?: { name: string }[] }).symbols || []).map((s) => s.name);
    assert("GET /api/symbols", symbols.status === 200 && names.includes("listSymbols"));
  }
} finally {
  child?.kill("SIGTERM");
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
