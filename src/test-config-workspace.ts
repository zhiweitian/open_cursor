import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getConfig, publicConfig, saveConfig, setWorkspace } from "@opencursor/agent-core";

let ok = 0;
let fail = 0;
function assert(name: string, cond: boolean) {
  if (cond) {
    ok++;
    console.log("✓", name);
  } else {
    fail++;
    console.log("✗", name);
  }
}

const ws = mkdtempSync(join(tmpdir(), "opencursor-cfg-"));
setWorkspace(ws);

try {
  mkdirSync(join(ws, "data"), { recursive: true });
  saveConfig({ provider: "deepseek", baseUrl: "https://api.deepseek.com", model: "deepseek-flash", apiKey: "sk-test-key-12345678", thinking: false });
  assert("config in workspace", getConfig().apiKey === "sk-test-key-12345678");
  const pub = publicConfig();
  assert("publicConfig masks key", pub.hasKey && !String(pub.apiKeyMasked).includes("sk-test-key-12345678"));
} finally {
  rmSync(ws, { recursive: true, force: true });
}

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
