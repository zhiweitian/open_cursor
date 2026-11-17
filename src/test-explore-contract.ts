/**
 * explore_codebase allowlist — no LLM / network.
 */
import { EXPLORE_READ_ONLY_TOOLS, builtinToolDefs } from "@opencursor/agent-core";

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

const defNames = new Set(builtinToolDefs.map((t) => t.function.name));
for (const name of EXPLORE_READ_ONLY_TOOLS) {
  assert(`explore allows ${name}`, defNames.has(name));
}

assert("explore disallows write_file", !EXPLORE_READ_ONLY_TOOLS.includes("write_file" as never));

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
