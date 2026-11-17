import { trimChatMessages, type ChatMsg } from "@opencursor/agent-core";

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

const head: ChatMsg[] = [
  { role: "system", content: "sys" },
  { role: "user", content: "ask" },
];
const bulky: ChatMsg[] = [
  ...head,
  { role: "assistant", content: "a".repeat(100) },
  { role: "tool", content: "b".repeat(100), name: "read_file" },
  { role: "assistant", content: "keep" },
];

const trimmed = trimChatMessages(bulky, 300);
assert("keeps system and user", trimmed[0]?.role === "system" && trimmed[1]?.role === "user");
assert("drops oldest bulk", trimmed.every((m) => (m.content?.length ?? 0) < 100));
assert("keeps later reply", trimmed.some((m) => m.content === "keep"));
assert("short thread unchanged", trimChatMessages(head, 10).length === 2);

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
