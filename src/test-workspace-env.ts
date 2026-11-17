import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-ws-env-"));
const root = join(import.meta.dirname, "..");

try {
  const r = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "-e",
      `import { workspace } from "@opencursor/agent-core"; console.log(workspace);`,
    ],
    { cwd: root, encoding: "utf8", env: { ...process.env, OPENCURSOR_WORKSPACE: ws } },
  );
  assert("OPENCURSOR_WORKSPACE child", r.status === 0);
  assert("workspace path matches", r.stdout.trim() === ws);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
