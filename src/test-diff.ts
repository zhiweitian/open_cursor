import { unifiedDiff } from "@opencursor/agent-core";

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

const d = unifiedDiff("a.txt", "old\n", "new\n");
assert("unifiedDiff header", d.includes("--- a/a.txt") && d.includes("+++ b/a.txt"));
assert("unifiedDiff del/add", d.includes("-old") && d.includes("+new"));

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
