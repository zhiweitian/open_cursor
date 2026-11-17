import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTool, setWorkspace } from "@opencursor/agent-core";

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

const ws = mkdtempSync(join(tmpdir(), "opencursor-nb-"));
setWorkspace(ws);
const nb = {
  cells: [
    { cell_type: "code", source: ["print('hi')\n"] },
    { cell_type: "markdown", source: "keep\n" },
  ],
  nbformat: 4,
};

try {
  writeFileSync(join(ws, "demo.ipynb"), JSON.stringify(nb));
  const out = await runTool(
    "edit_notebook",
    { path: "demo.ipynb", cell_index: "0", old_string: "print('hi')", new_string: "print('ok')" },
    {},
  );
  assert("edited", out.includes("已写入"));
  const saved = JSON.parse(readFileSync(join(ws, "demo.ipynb"), "utf8")) as {
    cells: { source: string }[];
  };
  assert("cell source", saved.cells[0]!.source === "print('ok')\n");
  assert("other cell", saved.cells[1]!.source === "keep\n");

  const missing = await runTool(
    "edit_notebook",
    { path: "demo.ipynb", cell_index: "0", old_string: "nope", new_string: "x" },
    {},
  );
  assert("missing snippet", missing.includes("未找到"));

  const notNb = await runTool("edit_notebook", { path: "demo.txt", cell_index: "0", old_string: "a", new_string: "b" }, {});
  assert("rejects non ipynb", notNb.includes(".ipynb"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
