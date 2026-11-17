import { isDangerousShell } from "@opencursor/agent-core";

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

assert("rm -rf /", isDangerousShell("rm -rf /"));
assert("sudo", isDangerousShell("sudo apt install x"));
assert("mkfs", isDangerousShell("mkfs.ext4 /dev/sda"));
assert("safe ls", !isDangerousShell("ls -la"));
assert("safe npm test", !isDangerousShell("npm test"));

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
