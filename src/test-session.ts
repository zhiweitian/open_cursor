import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTool, sessionContext, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-session-"));
setWorkspace(ws);

try {
  const asked = await runTool(
    "ask_question",
    {
      prompt: "用哪种写法？",
      options: JSON.stringify([
        { id: "a", label: "简短" },
        { id: "b", label: "详细" },
      ]),
    },
    {},
  );
  assert("ask text", asked.includes("用哪种写法"));
  const saved = JSON.parse(readFileSync(join(ws, "data", "question.json"), "utf8")) as { options: unknown[] };
  assert("question file", saved.options.length === 2);

  const few = await runTool("ask_question", { prompt: "x", options: "[]" }, {});
  assert("needs two options", few.includes("至少需要两个"));

  const mode = await runTool("switch_mode", { mode: "plan" }, {});
  assert("switch plan", mode.includes("plan"));
  assert("mode file", existsSync(join(ws, "data", "mode.json")));

  const bad = await runTool("switch_mode", { mode: "yolo" }, {});
  assert("rejects unknown mode", bad.includes("agent 或 plan"));

  const answered = await runTool("ask_question", {
    prompt: "用哪种写法？",
    options: JSON.stringify([
      { id: "a", label: "简短" },
      { id: "b", label: "详细" },
    ]),
  }, {});
  assert("ask again", answered.includes("等待选择"));
  const { answerQuestion } = await import("@opencursor/agent-core");
  assert("answer recorded", answerQuestion("a").includes("简短"));
  assert("question cleared", !existsSync(join(ws, "data", "question.json")));
  assert("context has choice", sessionContext().includes("简短"));

  const created = await runTool("create_goal", { title: "补齐目标", note: "先写测试" }, {});
  assert("create goal", created.includes("补齐目标"));
  const { goalContext } = await import("@opencursor/agent-core");
  assert("goal in prompt", goalContext().includes("补齐目标") && goalContext().includes("active"));
  const updated = await runTool("update_goal", { status: "done", note: "测完了" }, {});
  assert("update goal", updated.includes("done"));
  const empty = await runTool("create_goal", { title: "  " }, {});
  assert("empty title", empty.includes("不能为空"));
  const badStatus = await runTool("update_goal", { status: "later" }, {});
  assert("bad status", badStatus.includes("active"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
