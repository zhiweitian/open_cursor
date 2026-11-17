export type SymbolHit = {
  name: string;
  kind: "function" | "class" | "const" | "type";
  line: number;
};

const PATTERNS: { kind: SymbolHit["kind"]; re: RegExp }[] = [
  { kind: "function", re: /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/ },
  { kind: "class", re: /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/ },
  { kind: "type", re: /^(?:export\s+)?(?:type|interface)\s+([A-Za-z_$][\w$]*)/ },
  { kind: "const", re: /^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/ },
];

/** Line-based symbol scan. Not a full parser. */
export function listSymbols(source: string): SymbolHit[] {
  const hits: SymbolHit[] = [];
  const lines = source.split("\n");
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    for (const { kind, re } of PATTERNS) {
      const m = trimmed.match(re);
      if (!m) continue;
      hits.push({ name: m[1]!, kind, line: i + 1 });
      break;
    }
  });
  return hits;
}
