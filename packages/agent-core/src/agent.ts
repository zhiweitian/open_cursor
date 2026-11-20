import { chatCompletion, type ChatMsg } from "./llm.ts";
import { McpHub } from "./mcp.ts";
import type { Patch } from "./runs.ts";
import { getRun } from "./runs.ts";
import { expandAtMentions } from "./context.ts";
import { rulesSystemBlock } from "./rules.ts";
import { skillsSystemBlock } from "./skills.ts";
import { fireHooks } from "./hooks.ts";
import { trimChatMessages } from "./contextBudget.ts";
import { sessionContext } from "./session.ts";
import { goalContext } from "./goals.ts";
import { canvasContext } from "./canvas.ts";
import { selectionContext } from "./selection.ts";
import { openFileContext } from "./openFile.ts";
import { todoContext } from "./todos.ts";
import { agentSystemPrompt } from "./systemPrompt.ts";
import { builtinToolDefs, runTool, type ToolCtx } from "./tools.ts";

const TOOL_MSG_MAX = 12_000;
const RUN_CONTEXT_MAX = 80_000;

export type Msg = ChatMsg;
export type Step = {
  tool: string;
  args: Record<string, string>;
  out: string;
  patchId?: string;
  patchPath?: string;
  mcp?: boolean;
};

export async function pingModel() {
  const msg = await chatCompletion([{ role: "user", content: "只回复：ok" }], []);
  return (msg.content || "").trim();
}

export type AgentChatMode = "agent" | "plan" | "gather" | "normal";

const READ_ONLY_TOOLS = new Set([
  "read_file",
  "glob_file_search",
  "list_dir",
  "grep",
  "refresh_file_index",
  "grep_index",
  "read_lints",
  "codebase_search",
  "refresh_embeddings",
  "embedding_search",
  "canvas_read",
  "list_symbols",
  "explore_codebase",
  "web_fetch",
  "web_search",
]);

export function toolsForChatMode<T extends { function: { name: string } }>(mode: AgentChatMode | undefined, tools: T[]): T[] {
  if (!mode || mode === "agent") return tools;
  if (mode === "normal") return [];
  const allow = new Set(READ_ONLY_TOOLS);
  if (mode === "plan") {
    allow.add("canvas_write");
    allow.add("todo_write");
    allow.add("ask_question");
  }
  return tools.filter((tool) => allow.has(tool.function.name));
}

export function chatModeInstruction(mode: AgentChatMode | undefined): string {
  if (mode === "normal") return "\n\n当前模式：Ask。只回答问题。不要调用工具，不要改文件。";
  if (mode === "gather") return "\n\n当前模式：Gather。只读取代码来回答。不要改文件，不要运行命令。";
  if (mode === "plan") return "\n\n当前模式：Plan。先写出实现计划，然后停下来等用户确认。不要改文件，不要运行命令。";
  return "\n\n当前模式：Agent。可以读文件、改文件、运行命令。";
}

export type AgentOptions = ToolCtx & {
  chatMode?: AgentChatMode;
  useMcp?: boolean;
  signal?: AbortSignal;
  onStep?: (step: Step) => void | Promise<void>;
  onLlmDelta?: (delta: string, fullText: string) => void | Promise<void>;
  onToolStart?: (tool: string, args: Record<string, string>) => void | Promise<void>;
};

function abortedResult(steps: Step[], opts: AgentOptions, mcpSummary: ReturnType<McpHub["summary"]>) {
  return {
    text: "aborted",
    steps,
    patches: opts.runId ? pendingPatches(opts.runId) : [],
    mcpTools: mcpSummary,
  };
}

export async function runAgent(userText: string, opts: AgentOptions = {}) {
  const userContent = expandAtMentions(userText);
  const hub = new McpHub();
  const mode = opts.chatMode || "agent";
  const useMcp = opts.useMcp !== false && mode === "agent";
  try {
    if (useMcp) await hub.connectAll();
    const tools = toolsForChatMode(mode, [...builtinToolDefs, ...hub.openAiTools()]);
    const messages: Msg[] = [
      {
        role: "system",
        content: `${agentSystemPrompt(!!opts.reviewWrites)}${chatModeInstruction(mode)}${rulesSystemBlock()}${skillsSystemBlock()}${sessionContext()}${goalContext()}${canvasContext()}${selectionContext()}${openFileContext()}${todoContext()}`,
      },
      { role: "user", content: userContent },
    ];
    const steps: Step[] = [];
    for (let i = 0; i < 16; i++) {
      if (opts.signal?.aborted) {
        return abortedResult(steps, opts, hub.summary());
      }
      const prompt = trimChatMessages(messages, RUN_CONTEXT_MAX);
      let msg: ChatMsg;
      try {
        msg = await chatCompletion(prompt, tools, {
          onDelta: opts.onLlmDelta
            ? (delta, full) => {
                void opts.onLlmDelta!(delta, full);
              }
            : undefined,
        });
      } catch (e) {
        if (opts.signal?.aborted) {
          return abortedResult(steps, opts, hub.summary());
        }
        throw e;
      }
      if (opts.signal?.aborted) {
        return abortedResult(steps, opts, hub.summary());
      }
      messages.push(msg);
      const calls = msg.tool_calls;
      if (!calls?.length) {
        return {
          text: msg.content || "",
          steps,
          patches: opts.runId ? pendingPatches(opts.runId) : [],
          mcpTools: hub.summary(),
        };
      }
      for (const call of calls) {
        if (opts.signal?.aborted) {
          return abortedResult(steps, opts, hub.summary());
        }
        const args = JSON.parse(call.function.arguments || "{}") as Record<string, string>;
        await opts.onToolStart?.(call.function.name, args);
        await fireHooks("preTool", { tool: call.function.name, args });
        let out = "";
        const isMcp = call.function.name.startsWith("mcp_");
        let toolError: string | undefined;
        try {
          out = isMcp
            ? await hub.call(call.function.name, args)
            : await runTool(call.function.name, args, opts);
        } catch (e) {
          toolError = String(e);
          out = toolError;
        }
        await fireHooks("postTool", { tool: call.function.name, args, error: toolError });
        const step: Step = { tool: call.function.name, args, out: out.slice(0, 4000), mcp: isMcp };
        if (opts.runId && call.function.name === "write_file" && opts.reviewWrites) {
          const run = getRun(opts.runId);
          const last = run.patches[run.patches.length - 1];
          if (last?.status === "pending") {
            step.patchId = last.id;
            step.patchPath = last.path;
          }
        }
        steps.push(step);
        await opts.onStep?.(step);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: out.slice(0, TOOL_MSG_MAX),
        });
      }
    }
    return {
      text: "步数用尽",
      steps,
      patches: opts.runId ? pendingPatches(opts.runId) : [],
      mcpTools: hub.summary(),
    };
  } finally {
    await fireHooks("agentStop", {});
    await hub.closeAll();
  }
}

function pendingPatches(runId: string): Patch[] {
  return getRun(runId).patches.filter((p) => p.status === "pending");
}
