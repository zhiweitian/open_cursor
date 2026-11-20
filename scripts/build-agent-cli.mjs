import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

const shared = {
  bundle: true,
  platform: "node",
  target: "node20",
};

// Full agent pulls cross-spawn; CJS bundle avoids broken dynamic require in ESM.
await esbuild.build({
  ...shared,
  format: "cjs",
  entryPoints: ["src/agent-json.ts"],
  outfile: "dist/opencursor-agent.cjs",
});

await esbuild.build({
  ...shared,
  format: "esm",
  packages: "bundle",
  external: ["@huggingface/transformers"],
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  entryPoints: ["src/patch-json.ts"],
  outfile: "dist/opencursor-patches.mjs",
});

await esbuild.build({
  ...shared,
  format: "esm",
  packages: "bundle",
  external: ["@huggingface/transformers"],
  entryPoints: ["src/complete-json.ts"],
  outfile: "dist/opencursor-complete.mjs",
});

console.log("built dist/opencursor-agent.cjs + dist/opencursor-patches.mjs + dist/opencursor-complete.mjs");
