import { spawn, type ChildProcess } from "node:child_process";

export type ShellJob = {
  id: string;
  command: string;
  status: "running" | "done";
  code: number | null;
  output: string;
};

type LiveJob = ShellJob & { child?: ChildProcess };

const jobs = new Map<string, LiveJob>();
let seq = 0;

export function startShellJob(command: string, cwd: string): ShellJob {
  const id = `job-${++seq}`;
  const job: LiveJob = { id, command, status: "running", code: null, output: "" };
  const child = spawn("bash", ["-lc", command], { cwd });
  job.child = child;
  const append = (chunk: Buffer) => {
    job.output = (job.output + chunk.toString()).slice(-20_000);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  child.on("exit", (code) => {
    job.status = "done";
    job.code = code;
    job.child = undefined;
  });
  jobs.set(id, job);
  return { id, command, status: job.status, code: job.code, output: job.output };
}

export async function awaitShellJob(id: string, timeoutMs: number): Promise<string> {
  const job = jobs.get(id);
  if (!job) return "任务不存在";
  const wait = Math.min(Math.max(timeoutMs, 50), 30_000);
  const start = Date.now();
  while (job.status === "running" && Date.now() - start < wait) {
    await new Promise((r) => setTimeout(r, 20));
  }
  if (job.status === "running") return `仍在运行 ${id}`;
  return `完成 ${id} code=${job.code}\n${(job.output || "(无输出)").trim()}`;
}
