import { join } from "node:path";
import { embedText } from "./embeddingsHash.ts";
import { workspace } from "./workspace.ts";

export type Embedder = {
  id: "hash" | "bge";
  note: string;
  embed: (text: string) => Promise<number[]>;
};

const BGE_MODEL = "Xenova/bge-small-en-v1.5";

type Extractor = (text: string, opts: { pooling: "mean"; normalize: true }) => Promise<{ data: ArrayLike<number> }>;

let bge: Extractor | null = null;

function hashEmbedder(note = ""): Embedder {
  return {
    id: "hash",
    note,
    async embed(text: string) {
      return embedText(text);
    },
  };
}

async function bgeEmbedder(): Promise<Embedder> {
  if (!process.env.HF_HOME) process.env.HF_HOME = join(workspace, "data", "models");
  if (!bge) {
    const { pipeline } = await import("@huggingface/transformers");
    bge = (await pipeline("feature-extraction", BGE_MODEL, { dtype: "q8" })) as Extractor;
  }
  return {
    id: "bge",
    note: "",
    async embed(text: string) {
      const out = await bge!(text.slice(0, 512), { pooling: "mean", normalize: true });
      return Array.from(out.data, (n) => Number(n));
    },
  };
}

/** hash by default. OPENCURSOR_EMBED_MODEL=bge loads a local BGE small model. */
export async function getEmbedder(): Promise<Embedder> {
  const want = process.env.OPENCURSOR_EMBED_MODEL?.trim() || "hash";
  if (want !== "bge") return hashEmbedder();
  try {
    return await bgeEmbedder();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return hashEmbedder(`BGE 未加载，改用词袋：${message}`);
  }
}
