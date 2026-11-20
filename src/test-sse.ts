import { applyOpenAiSseLine, createStreamAccum, streamMessageFromAccum } from "@opencursor/agent-core";

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

const acc = createStreamAccum();
let deltas = "";
applyOpenAiSseLine(
  'data: {"choices":[{"delta":{"content":"Hel"}}]}',
  acc,
  (d) => { deltas += d; },
);
applyOpenAiSseLine('data: {"choices":[{"delta":{"content":"lo"}}]}', acc);
assert("sse content", acc.fullContent === "Hello" && deltas === "Hel");
assert("sse ignore done", (() => {
  const a = createStreamAccum();
  applyOpenAiSseLine("data: [DONE]", a);
  return a.fullContent === "";
})());

applyOpenAiSseLine(
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"c1","function":{"name":"read","arguments":"{"}}]}}]}',
  acc,
);
applyOpenAiSseLine(
  'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"}"}}]}}]}',
  acc,
);
const msg = streamMessageFromAccum(acc);
assert("sse tool_calls", msg.tool_calls?.[0]?.function.name === "read" && msg.tool_calls?.[0]?.type === "function");

console.log(`\n${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
