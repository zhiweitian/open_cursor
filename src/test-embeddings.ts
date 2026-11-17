import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cosine, embedText, runTool, setWorkspace } from "@opencursor/agent-core";

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

const same = cosine(embedText("widget pump"), embedText("widget pump"));
assert("identical near 1", same > 0.99);
assert("unrelated lower", cosine(embedText("widget pump"), embedText("apple banana")) < same);

const ws = mkdtempSync(join(tmpdir(), "opencursor-embed-"));
setWorkspace(ws);
try {
  writeFileSync(join(ws, "a.ts"), "export function zebraWidgetPump() { return 1; }\n");
  writeFileSync(join(ws, "b.ts"), "export function appleBanana() { return 2; }\n");
  const built = await runTool("refresh_embeddings", {}, {});
  assert("built", built.includes("2"));
  const hit = await runTool("embedding_search", { query: "zebra widget pump" }, {});
  const first = hit.split("\n")[0] ?? "";
  assert("ranks matching file", first.includes("a.ts"));
  writeFileSync(join(ws, "b.ts"), "export function appleBanana() { return 3; }\n");
  const again = await runTool("refresh_embeddings", {}, {});
  assert("reuses unchanged file", again.includes("沿用 1"));
  const emptyWs = mkdtempSync(join(tmpdir(), "opencursor-embed-empty-"));
  setWorkspace(emptyWs);
  const none = await runTool("embedding_search", { query: "zebra" }, {});
  assert("needs index", none.includes("为空"));
  rmSync(emptyWs, { recursive: true, force: true });
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
