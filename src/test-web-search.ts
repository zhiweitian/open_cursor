import { createServer } from "node:http";
import { runTool } from "@opencursor/agent-core";

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

const prev = process.env.OPENCURSOR_SEARCH_URL;
delete process.env.OPENCURSOR_SEARCH_URL;

const server = createServer((req, res) => {
  const q = new URL(req.url || "/", "http://127.0.0.1").searchParams.get("q");
  res.writeHead(200, { "content-type": "text/plain" });
  res.end(`hit:${q}`);
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const addr = server.address();
const port = typeof addr === "object" && addr ? addr.port : 0;

try {
  const missing = await runTool("web_search", { query: "cursor" }, {});
  assert("needs endpoint", missing.includes("未配置搜索"));

  process.env.OPENCURSOR_SEARCH_URL = `http://127.0.0.1:${port}/search`;
  const hit = await runTool("web_search", { query: "agent core" }, {});
  assert("search hit", hit.includes("HTTP 200") && hit.includes("hit:agent core"));

  const empty = await runTool("web_search", { query: "  " }, {});
  assert("empty query", empty.includes("不能为空"));
} finally {
  server.close();
  if (prev === undefined) delete process.env.OPENCURSOR_SEARCH_URL;
  else process.env.OPENCURSOR_SEARCH_URL = prev;
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
