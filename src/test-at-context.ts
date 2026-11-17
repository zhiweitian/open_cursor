import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expandAtMentions, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-at-"));
setWorkspace(ws);

try {
  writeFileSync(join(ws, "a.txt"), "AAA");
  writeFileSync(join(ws, "b.txt"), "BBB");
  const dup = expandAtMentions("对比 @a.txt 与 @a.txt");
  assert("dedupe @", dup.split("--- @a.txt ---").length === 2);
  const multi = expandAtMentions("看 @a.txt 和 @b.txt");
  assert("multi @", multi.includes("AAA") && multi.includes("BBB"));
  const bad = expandAtMentions("看 @missing.xyz");
  assert("missing @", bad.includes("(无法读取)"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
