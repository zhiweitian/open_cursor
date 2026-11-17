import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fireHooks, loadHooks, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-hooks-"));
setWorkspace(ws);

try {
  assert("empty workspace", loadHooks().length === 0);

  mkdirSync(join(ws, "data"), { recursive: true });
  writeFileSync(
    join(ws, "data", "hooks.json"),
    JSON.stringify({
      hooks: [
        { event: "preTool", command: "echo hi" },
        { event: "not-real", command: "x" },
        { event: "postTool", command: "  " },
      ],
    }),
  );
  const hooks = loadHooks();
  assert("filters invalid", hooks.length === 1 && hooks[0]!.event === "preTool");

  writeFileSync(
    join(ws, "data", "hooks.json"),
    JSON.stringify({
      hooks: [{ event: "preTool", command: 'echo "$OPENCURSOR_HOOK_TOOL" > .hook-tool.txt' }],
    }),
  );
  await fireHooks("preTool", { tool: "read_file", args: { path: "x" } });
  assert("fireHooks runs command", existsSync(join(ws, ".hook-tool.txt")));
  assert("hook env tool name", readFileSync(join(ws, ".hook-tool.txt"), "utf8").trim() === "read_file");
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
