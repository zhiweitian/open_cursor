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
  entryPoints: ["src/patch-json.ts"],
  outfile: "dist/opencursor-patches.mjs",
});

console.log("built dist/opencursor-agent.cjs + dist/opencursor-patches.mjs");
