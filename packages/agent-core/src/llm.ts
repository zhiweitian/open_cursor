import { chatUrl, getConfig } from "./config.ts";
import {
  applyOpenAiSseLine,
  createStreamAccum,
  streamMessageFromAccum,
  type ChatMsg,
} from "./llmStreamParse.ts";

export type { ChatMsg } from "./llmStreamParse.ts";

type StreamOpts = { onDelta?: (delta: string, fullText: string) => void };

export type ChatCompletionFn = (
  messages: ChatMsg[],
  tools: object[],
  streamOpts?: StreamOpts,
) => Promise<ChatMsg>;

let chatCompletionOverride: ChatCompletionFn | null = null;

/** Test-only: inject mock LLM responses (no network). */
export function setChatCompletionForTests(fn: ChatCompletionFn | null) {
  chatCompletionOverride = fn;
}

function emitMockStreamDeltas(text: string, onDelta?: (delta: string, fullText: string) => void) {
  if (!onDelta || !text) return;
  const mid = Math.max(1, Math.floor(text.length / 2));
  onDelta(text.slice(0, mid), text.slice(0, mid));
  if (mid < text.length) onDelta(text.slice(mid), text);
}

function normalizeMessage(msg: ChatMsg & { reasoning_content?: string }): ChatMsg {
  if (!msg.content && msg.reasoning_content) msg.content = msg.reasoning_content;
  if (msg.tool_calls?.length) {
    if (!msg.content) msg.content = "";
    msg.tool_calls = msg.tool_calls.map((call) => ({ ...call, type: "function" as const }));
  }
  return msg;
}

export async function chatCompletion(messages: ChatMsg[], tools: object[], streamOpts?: StreamOpts) {
  if (chatCompletionOverride) {
    const msg = await chatCompletionOverride(messages, tools, streamOpts);
    emitMockStreamDeltas(msg.content ?? "", streamOpts?.onDelta);
    return msg;
  }
  const c = getConfig();
  if (!c.apiKey) throw new Error("未配置 API Key");
  if (streamOpts?.onDelta) {
    try {
      return await chatCompletionStream(messages, tools, streamOpts.onDelta);
    } catch {
      // fallback if provider rejects stream
    }
  }
  const body: Record<string, unknown> = { model: c.model, messages };
  if (tools.length) body.tools = tools;
  if (c.thinking) body.thinking = { type: "enabled" };
  const res = await fetch(chatUrl(c), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${c.apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || JSON.stringify(json));
  return normalizeMessage(json.choices[0].message as ChatMsg & { reasoning_content?: string });
}

async function chatCompletionStream(
  messages: ChatMsg[],
  tools: object[],
  onDelta: (delta: string, fullText: string) => void,
): Promise<ChatMsg> {
  const c = getConfig();
  const body: Record<string, unknown> = { model: c.model, messages, stream: true };
  if (tools.length) body.tools = tools;
  if (c.thinking) body.thinking = { type: "enabled" };

  const res = await fetch(chatUrl(c), {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${c.apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error((json as { error?: { message?: string } }).error?.message || JSON.stringify(json));
  }
  if (!res.body) throw new Error("empty stream body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const acc = createStreamAccum();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      try {
        applyOpenAiSseLine(line, acc, onDelta);
      } catch {
        // skip malformed SSE chunk
      }
    }
  }
  if (buffer.trim()) {
    try {
      applyOpenAiSseLine(buffer, acc, onDelta);
    } catch {
      /* ignore */
    }
  }

  return streamMessageFromAccum(acc);
}
