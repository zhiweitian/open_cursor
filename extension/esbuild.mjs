import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");
const ctx = await esbuild.context({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.js",
  platform: "node",
  format: "cjs",
  external: ["vscode"],
  sourcemap: true,
});
if (watch) {
  await ctx.watch();
  console.log("watching extension…");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log("built extension/dist/extension.js");
}
