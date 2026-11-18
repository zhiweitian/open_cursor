/**
 * Completion CLI for the desktop editor.
 * One shot: node dist/opencursor-complete.mjs '<json>'
 * Stay warm: node dist/opencursor-complete.mjs --serve
 * Each stdin line is { id, workspace, text, cursor }.
 */
import { createInterface } from "node:readline";
import { writeSync } from "node:fs";
import { completeText } from "@opencursor/agent-core/complete";
import { setWorkspace } from "@opencursor/agent-core/workspace";

type Payload = { id?: string; workspace: string; text: string; cursor?: number };

async function one(payload: Payload) {
  setWorkspace(payload.workspace);
  const cursor = Number.isFinite(payload.cursor) ? Number(payload.cursor) : payload.text.length;
  const result = await completeText(payload.text, cursor);
  return { id: payload.id, ...result };
}

const raw = process.argv[2];
if (raw && raw !== "--serve") {
  console.log(JSON.stringify(await one(JSON.parse(raw) as Payload)));
} else {
  const rl = createInterface({ input: process.stdin });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      writeSync(1, JSON.stringify(await one(JSON.parse(line) as Payload)) + "\n");
    } catch (error) {
      const id = (() => {
        try {
          return (JSON.parse(line) as Payload).id;
        } catch {
          return undefined;
        }
      })();
      writeSync(1, JSON.stringify({ id, completion: "", via: "local", error: String(error) }) + "\n");
    }
  }
}
