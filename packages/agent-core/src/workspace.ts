import { resolve } from "node:path";

function resolveInitialWorkspace() {
  const fromEnv = process.env.OPENCURSOR_WORKSPACE?.trim();
  return resolve(fromEnv || process.cwd());
}

export let workspace = resolveInitialWorkspace();

export function setWorkspace(root: string) {
  workspace = resolve(root);
}
