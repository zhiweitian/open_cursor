import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canvasContext, loadCanvas, recordCanvasAction, runTool, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-canvas-"));
setWorkspace(ws);

try {
  const empty = await runTool("canvas_read", {}, {});
  assert("empty", empty === "还没有 Canvas");

  const written = await runTool(
    "canvas_write",
    {
      title: "审查结果",
      blocks: JSON.stringify([
        { type: "stat", label: "问题", value: "2" },
        { type: "table", headers: ["文件", "级别"], rows: [["a.ts", "高"]], rowTone: ["danger"] },
        { type: "timeline", items: [{ time: "10:00", title: "发现空指针" }] },
        { type: "button", label: "标为已看", action: "seen" },
        { type: "nope", text: "丢掉" },
      ]),
    },
    {},
  );
  assert("writes", written.includes("已打开 Canvas：审查结果"));
  const doc = loadCanvas();
  assert("keeps known blocks", doc?.blocks.length === 4 && doc.blocks[1]?.type === "table");
  assert("context", canvasContext().includes("审查结果"));

  const action = recordCanvasAction("seen");
  assert("action", action.includes("已记录") && canvasContext().includes("seen"));
  const read = await runTool("canvas_read", {}, {});
  assert("read", read.includes("seen") && read.includes("a.ts"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
