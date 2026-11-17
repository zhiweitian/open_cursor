import {
  expandAtMentions,
  inside,
  listRules,
  listSkills,
  buildTree,
  runTool,
  builtinToolDefs,
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

try {
  inside("packages/agent-core/src/agent.ts");
  assert("工作区内路径", true);
} catch {
  assert("工作区内路径", false);
}

assert("grep", (await runTool("grep", { pattern: "runAgent", glob: "packages/agent-core/src/*.ts" })).includes("runAgent"));
assert("skills", listSkills().some((s) => s.name === "mini"));
assert("rules", listRules().some((r) => r.path === "AGENTS.md"));
assert("@", expandAtMentions("看 @package.json").includes("opencursor") || expandAtMentions("看 @package.json").includes("name"));
assert("tree", buildTree().some((n) => n.name === "packages" || n.name === "extension"));
assert("explore_codebase tool", builtinToolDefs.some((t) => t.function.name === "explore_codebase"));

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
