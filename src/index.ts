import readline from "node:readline";
import { applyCliMockLlm, createRun, runAgent } from "@opencursor/agent-core";

applyCliMockLlm();

const once = process.argv.slice(2).join(" ").trim();
if (once) {
  const run = createRun();
  const r = await runAgent(once, { runId: run.id, reviewWrites: false });
  for (const s of r.steps) console.error(`→ ${s.tool}`, s.args);
  console.log(r.text);
  process.exit(0);
}

console.log("OpenCursor CLI。空行退出。");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = () =>
  rl.question("> ", async (line) => {
    const text = line.trim();
    if (!text) {
      rl.close();
      return;
    }
    try {
      const run = createRun();
      const r = await runAgent(text, { runId: run.id, reviewWrites: false });
      for (const s of r.steps) console.error(`→ ${s.tool}`, s.args);
      console.log(r.text);
    } catch (e) {
      console.error(e);
    }
    ask();
  });
ask();
