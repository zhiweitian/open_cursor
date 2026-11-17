/**
 * JSON 一行调用，供 desktop fork 通过 child_process 接入 agent-core。
 * 用法: node dist/opencursor-agent.cjs '{"workspace":"/path","message":"hi","reviewWrites":true}'
 * 测试：OPENCURSOR_MOCK_LLM=fast|tool|slow[:ms]
 */
import { applyCliMockLlm, createRun, runAgent, setWorkspace, syncDeepSeekConfigFromEnv } from "@opencursor/agent-core";

type Payload = {
  workspace: string;
  message: string;
  reviewWrites?: boolean;
  runId?: string;
  useMcp?: boolean;
  allowDangerousShell?: boolean;
  deepseekApiKey?: string;
  deepseekEndpoint?: string;
};

const raw = process.argv[2];
if (!raw) {
  console.error('usage: opencursor-agent \'{"workspace":"...","message":"..."}\'');
  process.exit(1);
}

let payload: Payload;
try {
  payload = JSON.parse(raw) as Payload;
} catch {
  console.error("invalid JSON payload");
  process.exit(1);
}

if (!payload.workspace?.trim() || !payload.message?.trim()) {
  console.error("workspace and message are required");
  process.exit(1);
}

const abort = new AbortController();
const onStop = () => abort.abort();
process.once("SIGTERM", onStop);
process.once("SIGINT", onStop);

void (async () => {
  applyCliMockLlm();
  setWorkspace(payload.workspace);
  if (payload.deepseekApiKey || payload.deepseekEndpoint) {
    syncDeepSeekConfigFromEnv({
      apiKey: payload.deepseekApiKey,
      endpoint: payload.deepseekEndpoint,
    });
  }
  const run = createRun();
  process.stderr.write(`${JSON.stringify({ event: "run", runId: run.id })}\n`);
  const result = await runAgent(payload.message, {
    runId: payload.runId ?? run.id,
    reviewWrites: payload.reviewWrites ?? true,
    useMcp: payload.useMcp,
    allowDangerousShell: payload.allowDangerousShell,
    signal: abort.signal,
    onStep: (step) => {
      process.stderr.write(`${JSON.stringify({ event: "step", step })}\n`);
    },
    onLlmDelta: (_delta, fullText) => {
      process.stderr.write(`${JSON.stringify({ event: "llm", text: fullText })}\n`);
    },
    onToolStart: (tool, args) => {
      process.stderr.write(`${JSON.stringify({ event: "tool_start", tool, args })}\n`);
    },
  });

  if (abort.signal.aborted) {
    process.exit(130);
  }

  console.log(
    JSON.stringify({
      text: result.text,
      steps: result.steps,
      runId: run.id,
      patches: result.patches?.map((p) => ({ id: p.id, path: p.path, status: p.status })),
    }),
  );
})().catch((e) => {
  if (abort.signal.aborted) {
    process.exit(130);
  }
  console.error(String(e));
  process.exit(1);
});
