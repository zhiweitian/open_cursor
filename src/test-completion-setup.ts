import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  completeText,
  installLocalCompletion,
  saveCompletionSettings,
  setCompletionInstallerForTests,
  setInstalledCompleterForTests,
  setWorkspace,
} from "@opencursor/agent-core";

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

const previous = process.env.OPENCURSOR_COMPLETE_URL;
delete process.env.OPENCURSOR_COMPLETE_URL;
const ws = mkdtempSync(join(tmpdir(), "opencursor-complete-setup-"));
setWorkspace(ws);

try {
  saveCompletionSettings({ url: "", useLocal: false });
  const prefix = await completeText("function helloWorld() {}\nhello");
  assert("prefix without setup", prefix.via === "local" && prefix.completion === "World");

  setCompletionInstallerForTests(async () => {
    saveCompletionSettings({ useLocal: true });
    return "已安装测试模型";
  });
  setInstalledCompleterForTests(async () => " from-local");
  const installedMsg = await installLocalCompletion();
  assert("install hook", installedMsg.includes("已安装"));
  const local = await completeText("hello");
  assert("uses installed model", local.via === "installed" && local.completion === " from-local");

  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ completion: " from-url" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  saveCompletionSettings({ url: `http://127.0.0.1:${port}/complete` });
  const remote = await completeText("hello");
  assert("url wins", remote.via === "model" && remote.completion === " from-url");
  server.close();
} finally {
  setCompletionInstallerForTests(null);
  setInstalledCompleterForTests(null);
  if (previous === undefined) delete process.env.OPENCURSOR_COMPLETE_URL;
  else process.env.OPENCURSOR_COMPLETE_URL = previous;
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
