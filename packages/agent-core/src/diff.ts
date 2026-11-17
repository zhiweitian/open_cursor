export function lineDiff(before: string, after: string) {
  const a = before.split("\n");
  const b = after.split("\n");
  const lines: { type: "add" | "del" | "ctx"; text: string }[] = [];
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) {
      if (x !== undefined) lines.push({ type: "ctx", text: x });
      continue;
    }
    if (x !== undefined) lines.push({ type: "del", text: x });
    if (y !== undefined) lines.push({ type: "add", text: y });
  }
  return lines;
}

export function unifiedDiff(path: string, before: string, after: string) {
  const lines = lineDiff(before, after);
  const out = [`--- a/${path}`, `+++ b/${path}`];
  for (const l of lines) {
    const p = l.type === "add" ? "+" : l.type === "del" ? "-" : " ";
    out.push(`${p}${l.text}`);
  }
  return out.join("\n");
}
