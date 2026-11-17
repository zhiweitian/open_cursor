import { completeWithInstalled, completionUrl, loadCompletionSettings, localCompletionReady } from "./completionSetup.ts";

const WORD = /[A-Za-z_][A-Za-z0-9_]*/g;

/**
 * Complete the identifier before `cursor` when the rest of the text
 * shares a longer common prefix. No model call.
 */
export function completeAt(text: string, cursor = text.length): string {
  const at = Math.max(0, Math.min(cursor, text.length));
  const prefix = text.slice(0, at).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? "";
  if (prefix.length < 2) return "";
  const start = at - prefix.length;
  const words = new Set<string>();
  for (const hit of text.matchAll(WORD)) {
    if ((hit.index ?? 0) === start) continue;
    const word = hit[0];
    if (word.startsWith(prefix) && word.length > prefix.length) words.add(word);
  }
  if (!words.size) return "";
  let common = [...words][0]!;
  for (const word of words) {
    let i = 0;
    while (i < common.length && i < word.length && common[i] === word[i]) i++;
    common = common.slice(0, i);
  }
  return common.length > prefix.length ? common.slice(prefix.length) : "";
}

/** URL first, then an installed local model, then the identifier prefix. */
export async function completeText(text: string, cursor = text.length): Promise<{ completion: string; via: "model" | "installed" | "local" }> {
  const at = Math.max(0, Math.min(cursor, text.length));
  const prefix = text.slice(0, at);
  const suffix = text.slice(at);
  const url = completionUrl();
  if (url) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prefix,
          suffix,
          model: process.env.OPENCURSOR_COMPLETE_MODEL || "complete",
        }),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const body = (await res.json()) as { completion?: string };
        if (typeof body.completion === "string" && body.completion) {
          return { completion: body.completion.slice(0, 200), via: "model" };
        }
      }
    } catch {
      /* fall through */
    }
  }
  if (loadCompletionSettings().useLocal && localCompletionReady()) {
    try {
      const completion = await completeWithInstalled(prefix, suffix);
      if (completion.trim()) return { completion, via: "installed" };
    } catch {
      /* fall through */
    }
  }
  return { completion: completeAt(text, at), via: "local" };
}
