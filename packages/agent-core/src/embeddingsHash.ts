const DIM = 48;

export function tokenize(text: string): string[] {
  const words = text.match(/[A-Za-z0-9_\u4e00-\u9fff]+/g) ?? [];
  const out: string[] = [];
  for (const word of words) {
    const pieces = word
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/_/g, " ")
      .toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length >= 2);
    out.push(...pieces);
  }
  return out;
}

export function embedText(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  for (const token of tokenize(text)) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    vec[Math.abs(hash) % DIM] += 1;
  }
  const norm = Math.sqrt(vec.reduce((sum, n) => sum + n * n, 0));
  if (!norm) return vec;
  return vec.map((n) => n / norm);
}

export function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
  return sum;
}
