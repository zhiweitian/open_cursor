const MAX_BYTES = 50_000;

/** Fetch http(s) text. Rejects other protocols. Truncates the body. */
export async function fetchUrlText(url: string, timeoutMs = 8000): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "URL 无效";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "只允许 http/https";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(parsed, { signal: ctrl.signal, redirect: "follow" });
    const text = await res.text();
    const body = text.slice(0, MAX_BYTES);
    return `HTTP ${res.status}\n${body}`;
  } catch (e) {
    return `抓取失败: ${e instanceof Error ? e.message : String(e)}`;
  } finally {
    clearTimeout(timer);
  }
}
