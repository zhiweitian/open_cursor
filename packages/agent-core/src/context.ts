import { readFileSync } from "node:fs";
import { inside } from "./tools.ts";

const AT = /@([A-Za-z0-9_./-]+)/g;

export function expandAtMentions(text: string) {
  const seen = new Set<string>();
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(AT.source, "g");
  while ((m = re.exec(text))) {
    const rel = m[1];
    if (seen.has(rel)) continue;
    seen.add(rel);
    try {
      const content = readFileSync(inside(rel), "utf8");
      blocks.push(`--- @${rel} ---\n${content.slice(0, 24_000)}`);
    } catch {
      blocks.push(`--- @${rel} ---\n(无法读取)`);
    }
  }
  if (!blocks.length) return text;
  return `${text}\n\n[用户通过 @ 附加上下文]\n${blocks.join("\n\n")}`;
}
