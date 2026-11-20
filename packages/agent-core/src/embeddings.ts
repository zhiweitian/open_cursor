import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getEmbedder } from "./embedder.ts";
import { cosine, embedText, tokenize } from "./embeddingsHash.ts";
import { refreshFileIndex } from "./fileIndex.ts";
import { workspace } from "./workspace.ts";

export { cosine, embedText, tokenize };

const TEXT_EXT = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "md", "json", "py", "go", "rs", "css", "html", "txt"]);
const MAX_CHUNKS = 2000;

export type EmbeddingChunk = {
  path: string;
  line: number;
  preview: string;
  vector: number[];
};

type FileEntry = { hash: string; chunks: EmbeddingChunk[] };
type Store = { embedder: string; files: Record<string, FileEntry>; builtAt?: string };

function storePath() {
  return join(workspace, "data", "embeddings.json");
}

function extOf(path: string) {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : "";
}

function loadStore(): Store | null {
  const path = storePath();
  if (!existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Store;
    if (!raw || typeof raw.files !== "object") return null;
    return raw;
  } catch {
    return null;
  }
}

export function loadEmbeddingChunks(): EmbeddingChunk[] {
  const store = loadStore();
  if (!store) return [];
  return Object.values(store.files).flatMap((file) => file.chunks);
}

export function embeddingStatus(): { chunks: number; files: number; embedder: string; builtAt: string } {
  const store = loadStore();
  if (!store) return { chunks: 0, files: 0, embedder: "", builtAt: "" };
  const chunks = Object.values(store.files).reduce((n, file) => n + file.chunks.length, 0);
  return { chunks, files: Object.keys(store.files).length, embedder: store.embedder, builtAt: store.builtAt ?? "" };
}

function chunksFor(path: string, text: string, vectors: number[][]): EmbeddingChunk[] {
  const lines = text.split("\n");
  const chunks: EmbeddingChunk[] = [];
  let n = 0;
  for (let i = 0; i < lines.length; i += 30) {
    const slice = lines.slice(i, i + 30).join("\n");
    if (!tokenize(slice).length) continue;
    const vector = vectors[n++];
    if (!vector) break;
    chunks.push({
      path,
      line: i + 1,
      preview: slice.replace(/\s+/g, " ").slice(0, 120),
      vector,
    });
  }
  return chunks;
}

export async function refreshEmbeddings(): Promise<{ chunks: number; reused: number; updated: number; embedder: string; note: string; builtAt: string }> {
  const embedder = await getEmbedder();
  const prev = loadStore();
  const same = prev?.embedder === embedder.id ? prev.files : {};
  const files = refreshFileIndex().files.filter((file) => TEXT_EXT.has(extOf(file)));
  const next: Record<string, FileEntry> = {};
  let reused = 0;
  let updated = 0;
  let chunks = 0;
  for (const file of files) {
    if (chunks >= MAX_CHUNKS) break;
    let text = "";
    try {
      text = readFileSync(join(workspace, file), "utf8");
    } catch {
      continue;
    }
    if (!text.trim() || text.includes("\0") || text.length > 200_000) continue;
    const hash = createHash("sha1").update(text).digest("hex");
    const old = same[file];
    if (old?.hash === hash) {
      next[file] = old;
      reused++;
      chunks += old.chunks.length;
      continue;
    }
    const slices: string[] = [];
    const lines = text.split("\n");
    for (let i = 0; i < lines.length && slices.length + chunks < MAX_CHUNKS; i += 30) {
      const slice = lines.slice(i, i + 30).join("\n");
      if (tokenize(slice).length) slices.push(slice);
    }
    const vectors: number[][] = [];
    for (const slice of slices) vectors.push(await embedder.embed(slice));
    next[file] = { hash, chunks: chunksFor(file, text, vectors) };
    updated++;
    chunks += next[file].chunks.length;
  }
  mkdirSync(dirname(storePath()), { recursive: true });
  const builtAt = new Date().toISOString();
  const store: Store = { embedder: embedder.id, files: next, builtAt };
  writeFileSync(storePath(), JSON.stringify(store));
  return { chunks, reused, updated, embedder: embedder.id, note: embedder.note, builtAt };
}

export async function searchEmbeddings(query: string, limit = 5): Promise<string> {
  const store = loadStore();
  const chunks = store ? Object.values(store.files).flatMap((file) => file.chunks) : [];
  if (!chunks.length) return "向量索引为空，先调用 refresh_embeddings";
  if (!query.trim()) return "缺少 query";
  const embedder = await getEmbedder();
  if (store && store.embedder !== embedder.id) return `索引是 ${store.embedder}，当前是 ${embedder.id}，请重新 refresh_embeddings`;
  const queryVec = await embedder.embed(query);
  const hits = chunks
    .map((chunk) => ({ chunk, score: cosine(queryVec, chunk.vector) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  if (!hits.length) return "(无匹配)";
  return hits.map((hit) => `${hit.score.toFixed(2)} ${hit.chunk.path}:${hit.chunk.line} ${hit.chunk.preview}`).join("\n");
}
