import { createServer } from "node:http";
import { completeText } from "@opencursor/agent-core";

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

const previousUrl = process.env.OPENCURSOR_COMPLETE_URL;
const previousModel = process.env.OPENCURSOR_COMPLETE_MODEL;
delete process.env.OPENCURSOR_COMPLETE_URL;

const local = await completeText("function helloWorld() {}\nhello");
assert("local fallback", local.via === "local" && local.completion === "World");

const server = createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(chunk as Buffer));
  req.on("end", () => {
    const body = JSON.parse(Buffer.concat(chunks).toString() || "{}") as { model?: string };
    if (body.model === "fail") {
      res.writeHead(500);
      res.end("no");
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ completion: " from-model" }));
  });
});

await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
const address = server.address();
const port = typeof address === "object" && address ? address.port : 0;
process.env.OPENCURSOR_COMPLETE_URL = `http://127.0.0.1:${port}/complete`;
process.env.OPENCURSOR_COMPLETE_MODEL = "tiny";

const modeled = await completeText("hello");
assert("uses completion url", modeled.via === "model" && modeled.completion === " from-model");

process.env.OPENCURSOR_COMPLETE_MODEL = "fail";
const fell = await completeText("function helloWorld() {}\nhello");
assert("error falls back", fell.via === "local" && fell.completion === "World");

server.close();
if (previousUrl === undefined) delete process.env.OPENCURSOR_COMPLETE_URL;
else process.env.OPENCURSOR_COMPLETE_URL = previousUrl;
if (previousModel === undefined) delete process.env.OPENCURSOR_COMPLETE_MODEL;
else process.env.OPENCURSOR_COMPLETE_MODEL = previousModel;

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
