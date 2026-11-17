import { readFileSync } from "node:fs";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { refreshFileIndex } from "./fileIndex.ts";
import { workspace } from "./workspace.ts";

const DIM = 48;
const TEXT_EXT = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "md", "json", "py", "go", "rs", "css", "html", "txt"]);

export type EmbeddingChunk = {
  path: string;
  line: number;
  preview: string;
  vector: number[];
};

function storePath() {
  return join(workspace, "data", "embeddings.json");
}

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

function extOf(path: string) {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}

export function loadEmbeddingChunks(): EmbeddingChunk[] {
  const path = storePath();
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { chunks?: EmbeddingChunk[] };
    return Array.isArray(raw.chunks) ? raw.chunks : [];
  } catch {
    return [];
  }
}

export function refreshEmbeddings(): { chunks: number } {
  const files = refreshFileIndex().files.filter((file) => TEXT_EXT.has(extOf(file)));
  const chunks: EmbeddingChunk[] = [];
  for (const file of files) {
    if (chunks.length >= 400) break;
    let text = "";
    try {
      text = readFileSync(join(workspace, file), "utf8");
    } catch {
      continue;
    }
    if (!text.trim() || text.includes("\0") || text.length > 200_000) continue;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length && chunks.length < 400; i += 30) {
      const slice = lines.slice(i, i + 30).join("\n");
      if (!tokenize(slice).length) continue;
      chunks.push({
        path: file,
        line: i + 1,
        preview: slice.replace(/\s+/g, " ").slice(0, 120),
        vector: embedText(slice),
      });
    }
  }
  mkdirSync(dirname(storePath()), { recursive: true });
  writeFileSync(storePath(), JSON.stringify({ chunks }));
  return { chunks: chunks.length };
}

export function searchEmbeddings(query: string, limit = 5): string {
  const chunks = loadEmbeddingChunks();
  if (!chunks.length) return "向量索引为空，先调用 refresh_embeddings";
  if (!query.trim()) return "缺少 query";
  const queryVec = embedText(query);
  const hits = chunks
    .map((chunk) => ({ chunk, score: cosine(queryVec, chunk.vector) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  if (!hits.length) return "(无匹配)";
  return hits.map((hit) => `${hit.score.toFixed(2)} ${hit.chunk.path}:${hit.chunk.line} ${hit.chunk.preview}`).join("\n");
}
