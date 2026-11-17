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

/** Search via OPENCURSOR_SEARCH_URL. The endpoint receives ?q=. */
export async function webSearch(query: string): Promise<string> {
  const q = query.trim();
  if (!q) return "query 不能为空";
  const base = process.env.OPENCURSOR_SEARCH_URL?.trim();
  if (!base) return "未配置搜索。设置 OPENCURSOR_SEARCH_URL 为接受 ?q= 的 http(s) 地址。";
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    return "OPENCURSOR_SEARCH_URL 无效";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "搜索地址只允许 http/https";
  url.searchParams.set("q", q);
  return fetchUrlText(url.toString());
}

/** Page snapshot: status, title, links, and visible text. Not a real browser. */
export async function browserOpen(url: string): Promise<string> {
  const raw = await fetchUrlText(url);
  if (!raw.startsWith("HTTP ")) return raw;
  const split = raw.indexOf("\n");
  const status = raw.slice(0, split);
  const html = raw.slice(split + 1);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || "（无）";
  const links: string[] = [];
  for (const hit of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    if (links.length >= 20) break;
    const label = hit[2]?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    links.push(`${label || hit[1]} ${hit[1]}`);
  }
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);
  return `${status}\n标题：${title}\n链接：\n${links.join("\n") || "（无）"}\n正文：${text}`;
}
