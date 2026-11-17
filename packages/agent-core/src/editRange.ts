/** Replace 1-based inclusive lines. Keeps a trailing newline if the file had one. */
export function replaceLineRange(source: string, start: number, end: number, replacement: string): string {
  const trailing = source.endsWith("\n");
  const lines = source.split("\n");
  if (trailing) lines.pop();
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > lines.length) {
    throw new Error("行号无效");
  }
  const insert = replacement.replace(/\n$/, "").split("\n");
  lines.splice(start - 1, end - start + 1, ...insert);
  return lines.join("\n") + (trailing ? "\n" : "");
}
