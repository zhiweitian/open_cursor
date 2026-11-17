import { completeAt } from "@opencursor/agent-core";

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

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
