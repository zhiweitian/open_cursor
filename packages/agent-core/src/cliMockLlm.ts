/**
 * Headless / CI mock LLM for agent CLI. Set OPENCURSOR_MOCK_LLM:
 * - fast — single reply "mock-ok"
 * - tool — list_dir then "mock-tool-done"
 * - slow[:ms] — delay then reply (abort tests)
 */
import { setChatCompletionForTests, type ChatMsg } from "./llm.ts";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function applyCliMockLlm(): boolean {
  const raw = process.env.OPENCURSOR_MOCK_LLM?.trim();
  if (!raw) return false;

  if (raw === "fast") {
    setChatCompletionForTests(async (messages) => {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      const text = String(lastUser?.content ?? "");
      if (text.includes("只回复：ok") || text.includes("只回复:ok")) {
        return { role: "assistant", content: "ok" };
      }
      return { role: "assistant", content: "mock-ok" };
    });
    return true;
  }

  if (raw === "tool") {
    let turn = 0;
    setChatCompletionForTests(async () => {
      turn++;
      if (turn === 1) {
        return {
          role: "assistant",
          content: null,
          tool_calls: [
            {
              id: "mock1",
              function: { name: "list_dir", arguments: JSON.stringify({ path: "." }) },
            },
          ],
        } satisfies ChatMsg;
      }
      return { role: "assistant", content: "mock-tool-done" };
    });
    return true;
  }

  if (raw === "slow" || raw.startsWith("slow:")) {
    const ms = raw === "slow" ? 8000 : Number(raw.slice(5)) || 8000;
    setChatCompletionForTests(async () => {
      await sleep(ms);
      return { role: "assistant", content: "mock-late" };
    });
    return true;
  }

  return false;
}
