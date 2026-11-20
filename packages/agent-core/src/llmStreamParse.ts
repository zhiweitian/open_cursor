export type ChatMsg = {
  role: string;
  content?: string | null;
  tool_calls?: { id: string; type?: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
};

export type StreamAccum = {
  fullContent: string;
  role: string;
  toolCalls: Map<number, { id: string; name: string; arguments: string }>;
};

export function createStreamAccum(): StreamAccum {
  return { fullContent: "", role: "assistant", toolCalls: new Map() };
}

/** Parse one SSE `data: {...}` line (OpenAI-compatible chat completions stream). */
export function applyOpenAiSseLine(
  line: string,
  acc: StreamAccum,
  onDelta?: (delta: string, fullText: string) => void,
): void {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return;
  const data = trimmed.slice(5).trim();
  if (!data || data === "[DONE]") return;
  const chunk = JSON.parse(data) as {
    choices?: {
      delta?: {
        role?: string;
        content?: string | null;
        reasoning_content?: string | null;
        tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[];
      };
    }[];
  };
  const delta = chunk.choices?.[0]?.delta;
  if (!delta) return;
  if (delta.role) acc.role = delta.role;
  const piece = delta.content ?? delta.reasoning_content ?? "";
  if (piece) {
    acc.fullContent += piece;
    onDelta?.(piece, acc.fullContent);
  }
  for (const tc of delta.tool_calls ?? []) {
    const idx = tc.index ?? 0;
    let tool = acc.toolCalls.get(idx);
    if (!tool) {
      tool = { id: tc.id ?? "", name: "", arguments: "" };
      acc.toolCalls.set(idx, tool);
    }
    if (tc.id) tool.id = tc.id;
    if (tc.function?.name) tool.name += tc.function.name;
    if (tc.function?.arguments) tool.arguments += tc.function.arguments;
  }
}

export function streamMessageFromAccum(acc: StreamAccum): ChatMsg {
  const msg: ChatMsg = { role: acc.role, content: acc.fullContent || (acc.toolCalls.size ? "" : null) };
  if (acc.toolCalls.size) {
    msg.tool_calls = [...acc.toolCalls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, tc]) => ({
        id: tc.id || `call_${Math.random().toString(36).slice(2)}`,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments || "{}" },
      }));
  }
  return msg;
}
