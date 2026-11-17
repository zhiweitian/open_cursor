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
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("fetched-ok");
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const addr = server.address();
const port = typeof addr === "object" && addr ? addr.port : 0;

try {
  const out = await runTool("web_fetch", { url: `http://127.0.0.1:${port}/hi` }, {});
  assert("local fetch", out.includes("HTTP 200") && out.includes("fetched-ok"));
  const bad = await runTool("web_fetch", { url: "file:///etc/passwd" }, {});
  assert("rejects file url", bad.includes("只允许 http"));
  const junk = await runTool("web_fetch", { url: "not a url" }, {});
  assert("rejects junk", junk.includes("URL 无效"));
} finally {
  server.close();
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
