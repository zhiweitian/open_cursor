import { chatCompletion, type ChatMsg } from "./llm.ts";
import { builtinToolDefs, runTool } from "./tools.ts";
import { workspace } from "./workspace.ts";

/** Only these tools may run inside explore_codebase (read-only). Exported for tests. */
export const EXPLORE_READ_ONLY_TOOLS = [
  "read_file",
  "list_dir",
  "grep",
  "glob_file_search",
  "codebase_search",
  "read_lints",
] as const;

const READ_ONLY = new Set<string>(EXPLORE_READ_ONLY_TOOLS);

const exploreTools = builtinToolDefs.filter((t) => READ_ONLY.has(t.function.name));

export async function runExplore(task: string) {
  const messages: ChatMsg[] = [
    {
      role: "system",
      content: `你是只读探索子 Agent。工作区：${workspace}。只能搜索和读文件，不能改。用中文总结发现。`,
    },
    { role: "user", content: task },
  ];
  for (let i = 0; i < 10; i++) {
    const msg = await chatCompletion(messages, exploreTools);
    messages.push(msg);
    const calls = msg.tool_calls;
    if (!calls?.length) return (msg.content || "").slice(0, 12_000);
    for (const call of calls) {
      let out = "";
      try {
        if (!READ_ONLY.has(call.function.name)) throw new Error("子 Agent 禁止写操作");
        out = await runTool(call.function.name, JSON.parse(call.function.arguments || "{}"), {});
      } catch (e) {
        out = String(e);
      }
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: out.slice(0, 8000),
      });
    }
  }
  return "探索步数用尽";
}
