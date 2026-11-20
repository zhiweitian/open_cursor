import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { completeAt, completeText, setWorkspace } from "@opencursor/agent-core";

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

const sample = "function helloWorld() {}\nhello";
assert("unique suffix", completeAt(sample) === "World");
assert("cursor mid word", completeAt("alpha beta\nal", 14) === "pha");
assert("short prefix", completeAt("name\nn") === "");
assert("ambiguous", completeAt("name navy\nna") === "");
assert("no match", completeAt("only\nzz") === "");

const previousUrl = process.env.OPENCURSOR_COMPLETE_URL;
delete process.env.OPENCURSOR_COMPLETE_URL;
const ws = mkdtempSync(join(tmpdir(), "opencursor-complete-"));
setWorkspace(ws);
try {
  writeFileSync(join(ws, "a.ts"), "export function zebraWidgetPump() { return 1; }\n");
  const wider = await completeText("zebra");
  assert("other file", wider.via === "local" && wider.completion === "WidgetPump");
  const here = await completeText("function helloWorld() {}\nhello");
  assert("buffer wins", here.completion === "World");
  writeFileSync(join(ws, "b.ts"), "export function national() { return 1; }\n");
  const ambiguous = await completeText("name navy\nna");
  assert("buffer ambiguity stays", ambiguous.completion === "");
} finally {
  rmSync(ws, { recursive: true, force: true });
  if (previousUrl === undefined) delete process.env.OPENCURSOR_COMPLETE_URL;
  else process.env.OPENCURSOR_COMPLETE_URL = previousUrl;
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
