import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listRules, listSkills, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-skills-"));
setWorkspace(ws);

try {
  assert("empty skills", listSkills().length === 0);
  mkdirSync(join(ws, ".cursor", "skills", "demo"), { recursive: true });
  writeFileSync(
    join(ws, ".cursor", "skills", "demo", "SKILL.md"),
    "---\nname: Demo\ndescription: hello skill\n---\nbody\n",
  );
  const skills = listSkills();
  assert("skill name", skills.length === 1 && skills[0]!.name === "Demo");

  writeFileSync(join(ws, "AGENTS.md"), "always use chinese\n");
  const rules = listRules();
  assert("agents.md rule", rules.some((r) => r.path === "AGENTS.md" && r.bytes > 0));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
