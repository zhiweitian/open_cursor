import { spawnSync } from "node:child_process";
import { completeWithInstalled, completionUrl, loadCompletionSettings, localCompletionReady } from "./completionSetup.ts";
import { workspace } from "./workspace.ts";

const WORD = /[A-Za-z_][A-Za-z0-9_]*/g;

function continuation(prefix: string, words: Set<string>): string {
  if (!words.size) return "";
  let common = [...words][0]!;
  for (const word of words) {
    let i = 0;
    while (i < common.length && i < word.length && common[i] === word[i]) i++;
    common = common.slice(0, i);
    if (common.length <= prefix.length) return "";
  }
  return common.slice(prefix.length);
}

function bufferWords(text: string, cursor: number): { prefix: string; words: Set<string> } {
  const at = Math.max(0, Math.min(cursor, text.length));
  const prefix = text.slice(0, at).match(/[A-Za-z_][A-Za-z0-9_]*$/)?.[0] ?? "";
  const words = new Set<string>();
  if (prefix.length < 2) return { prefix, words };
  const start = at - prefix.length;
  for (const hit of text.matchAll(WORD)) {
    if ((hit.index ?? 0) === start) continue;
    const word = hit[0];
    if (word.startsWith(prefix) && word.length > prefix.length) words.add(word);
  }
  return { prefix, words };
}

/**
 * Complete the identifier before `cursor` when the rest of the text
 * shares a longer common prefix. No model call.
 */
export function completeAt(text: string, cursor = text.length): string {
  const { prefix, words } = bufferWords(text, cursor);
  if (prefix.length < 2) return "";
  return continuation(prefix, words);
}

/** Current buffer first. If it has no match, search other source files with rg. */
export function completeInWorkspace(text: string, cursor = text.length): string {
  const { prefix, words } = bufferWords(text, cursor);
  if (prefix.length < 2) return "";
  const local = continuation(prefix, words);
  if (local || words.size || prefix.length < 3 || !workspace) return local;
  const found = spawnSync(
    "rg",
    [
      "-o",
      "--no-filename",
      "--max-count",
      "20",
      "--max-filesize",
      "200K",
      "-g",
      "!node_modules/**",
      "-g",
      "!.git/**",
      "-g",
      "!data/**",
      "-g",
      "!dist/**",
      "-g",
      "!out/**",
      "-g",
      "*.ts",
      "-g",
      "*.tsx",
      "-g",
      "*.js",
      "-g",
      "*.jsx",
      "-g",
      "*.py",
      "-g",
      "*.go",
      "-g",
      "*.rs",
      `\\b${prefix}[A-Za-z0-9_]+`,
      workspace,
    ],
    { encoding: "utf8", timeout: 200, maxBuffer: 200_000 },
  );
  if (found.error || !found.stdout) return "";
  const wider = new Set<string>();
  for (const line of found.stdout.split("\n")) {
    const word = line.trim();
    if (!word.startsWith(prefix) || word.length <= prefix.length) continue;
    wider.add(word);
    if (wider.size > 30) return "";
  }
  return continuation(prefix, wider);
}

/** URL first, then an installed local model, then the identifier prefix. */
export async function completeText(text: string, cursor = text.length, override?: { url?: string; model?: string }): Promise<{ completion: string; via: "model" | "installed" | "local" }> {
  const at = Math.max(0, Math.min(cursor, text.length));
  const prefix = text.slice(0, at);
  const suffix = text.slice(at);
  const url = override?.url?.trim() || completionUrl();
  const model = override?.model?.trim() || process.env.OPENCURSOR_COMPLETE_MODEL || "complete";
  if (url) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prefix,
          suffix,
          model,
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
  return { completion: completeInWorkspace(text, at), via: "local" };
}
