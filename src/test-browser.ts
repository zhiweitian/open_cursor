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

const server = createServer((_req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end("<html><head><title>示例页</title><style>.x{color:red}</style></head><body><a href=\"/next\">下一页</a><script>secret()</script><p>可见正文</p></body></html>");
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;

try {
  const out = await runTool("browser_open", { url: `http://127.0.0.1:${port}/` }, {});
  assert("status", out.includes("HTTP 200"));
  assert("title", out.includes("标题：示例页"));
  assert("link", out.includes("下一页 /next"));
  assert("text", out.includes("可见正文"));
  assert("drops script", !out.includes("secret()"));
  const bad = await runTool("browser_open", { url: "ftp://example.com" }, {});
  assert("rejects ftp", bad.includes("http/https"));
} finally {
  server.close();
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
