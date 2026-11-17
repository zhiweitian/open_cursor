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
import { selectionContext } from "./selection.ts";
import { builtinToolDefs, runTool, workspace, type ToolCtx } from "./tools.ts";

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

export type AgentOptions = ToolCtx & {
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
  const useMcp = opts.useMcp !== false;
  try {
    if (useMcp) await hub.connectAll();
    const tools = [...builtinToolDefs, ...hub.openAiTools()];
    const messages: Msg[] = [
      {
        role: "system",
        content: `你是本地仓库里的编程助手。工作区：${workspace}。用中文简短回答。改文件前先读。复杂探索可调用 explore_codebase。${
          opts.reviewWrites ? "写入会进入待审核补丁，告知用户去界面接受。" : ""
        }${rulesSystemBlock()}${skillsSystemBlock()}${sessionContext()}${goalContext()}${selectionContext()}`,
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
