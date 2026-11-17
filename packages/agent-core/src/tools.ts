import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import fg from "fast-glob";
import { isIgnored } from "./ignore.ts";
import { applyWriteImmediate, stageWrite } from "./runs.ts";
import { saveTodos, type TodoItem } from "./todos.ts";
import { stageQuestion, switchMode, type AskOption } from "./session.ts";
import { replaceNotebookCell } from "./notebook.ts";
import { workspace } from "./workspace.ts";

export { workspace };

export type ToolCtx = {
  runId?: string;
  reviewWrites?: boolean;
  allowDangerousShell?: boolean;
};

const dangerous = [
  /\brm\s+(-[^\s]*f[^\s]*\s+)?\/\s/,
  /\brm\s+-[^\s]*r[^\s]*f[^\s]*\s+\//,
  /\bsudo\b/,
  /\bmkfs\b/,
  /\bdd\s+if=/,
  />\s*\/dev\/sd/,
  /\bchmod\s+-R\s+777\s+\//,
];

export function inside(path: string) {
  const abs = resolve(workspace, path);
  const root = workspace.endsWith("/") ? workspace : workspace + "/";
  if (abs !== workspace && !abs.startsWith(root)) throw new Error("路径超出工作区");
  return abs;
}

export const builtinToolDefs = [
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "读取文件",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "write_file",
      description: "写入文件（覆盖）；Web 审核模式下会生成待接受补丁",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_replace",
      description: "在文件中替换一段文本（需唯一匹配）",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          old_string: { type: "string" },
          new_string: { type: "string" },
        },
        required: ["path", "old_string", "new_string"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_file",
      description: "删除文件",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "glob_file_search",
      description: "按 glob 找文件（如 src/**/*.ts）",
      parameters: { type: "object", properties: { pattern: { type: "string" } }, required: ["pattern"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_dir",
      description: "列出目录",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "grep",
      description: "在工作区搜文本（尊重 .gitignore / .cursorignore）",
      parameters: {
        type: "object",
        properties: { pattern: { type: "string" }, glob: { type: "string" } },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "shell",
      description: "在工作区跑命令（危险命令会被拦截）",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_lints",
      description: "读 TypeScript 诊断（npm run typecheck）",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "可选，只保留含该路径的行" } },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "codebase_search",
      description: "用关键词在代码库搜相关行（简易语义搜索）",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "todo_write",
      description: "更新任务清单。todos 为 JSON 数组 [{id,content,status}]，status: pending|in_progress|completed|cancelled。merge 为 true 时按 id 合并。",
      parameters: {
        type: "object",
        properties: {
          todos: { type: "string" },
          merge: { type: "string", description: "true 则合并，否则整表替换" },
        },
        required: ["todos"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "ask_question",
      description: "向用户提一个选择题。options 为 JSON 数组 [{id,label}]，至少两项。",
      parameters: {
        type: "object",
        properties: { prompt: { type: "string" }, options: { type: "string" } },
        required: ["prompt", "options"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "switch_mode",
      description: "切换工作模式：agent 或 plan。",
      parameters: {
        type: "object",
        properties: { mode: { type: "string" } },
        required: ["mode"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "edit_notebook",
      description: "修改 .ipynb 里某一个单元格中唯一的一段文本。cell_index 从 0 开始。",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          cell_index: { type: "string" },
          old_string: { type: "string" },
          new_string: { type: "string" },
        },
        required: ["path", "cell_index", "old_string", "new_string"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "explore_codebase",
      description: "启动只读子 Agent 探索代码库（搜索+读文件，不改磁盘）",
      parameters: {
        type: "object",
        properties: { task: { type: "string" } },
        required: ["task"],
      },
    },
  },
];

export const toolDefs = builtinToolDefs;

export function isDangerousShell(command: string) {
  return dangerous.some((re) => re.test(command));
}

function writeContent(rel: string, content: string, ctx: ToolCtx) {
  if (ctx.reviewWrites && ctx.runId) {
    const p = stageWrite(ctx.runId, rel, content);
    return `待审核补丁 ${p.id}：${rel}（尚未写入，需用户在界面接受）`;
  }
  applyWriteImmediate(ctx.runId, rel, content);
  return `已写入 ${rel}`;
}

export async function runTool(name: string, args: Record<string, string>, ctx: ToolCtx = {}): Promise<string> {
  if (name === "todo_write") {
    let parsed: TodoItem[] = [];
    try {
      parsed = JSON.parse(args.todos || "[]") as TodoItem[];
    } catch {
      return "todos 不是合法 JSON";
    }
    if (!Array.isArray(parsed)) return "todos 需要是数组";
    const list = saveTodos(parsed, args.merge === "true");
    return list.map((t) => `${t.status} ${t.id}: ${t.content}`).join("\n") || "(空清单)";
  }
  if (name === "ask_question") {
    let options: AskOption[] = [];
    try {
      options = JSON.parse(args.options || "[]") as AskOption[];
    } catch {
      return "options 不是合法 JSON";
    }
    if (!Array.isArray(options)) return "options 需要是数组";
    return stageQuestion(args.prompt || "", options);
  }
  if (name === "switch_mode") {
    return switchMode(args.mode || "");
  }
  if (name === "edit_notebook") {
    if (!args.path?.endsWith(".ipynb")) return "只能编辑 .ipynb";
    const abs = inside(args.path);
    const rel = relative(workspace, abs);
    const idx = Number(args.cell_index);
    if (!Number.isInteger(idx) || idx < 0) return "cell_index 无效";
    try {
      const next = replaceNotebookCell(readFileSync(abs, "utf8"), idx, args.old_string ?? "", args.new_string ?? "");
      return writeContent(rel, next, ctx);
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }
  if (name === "explore_codebase") {
    const { runExplore } = await import("./explore-agent.ts");
    return runExplore(args.task || "");
  }
  if (name === "read_file") {
    return readFileSync(inside(args.path), "utf8");
  }
  if (name === "write_file") {
    const rel = relative(workspace, inside(args.path));
    return writeContent(rel, args.content ?? "", ctx);
  }
  if (name === "search_replace") {
    const abs = inside(args.path);
    const rel = relative(workspace, abs);
    const cur = readFileSync(abs, "utf8");
    const oldS = args.old_string ?? "";
    const count = cur.split(oldS).length - 1;
    if (count === 0) throw new Error("old_string 未找到");
    if (count > 1) throw new Error("old_string 不唯一");
    return writeContent(rel, cur.replace(oldS, args.new_string ?? ""), ctx);
  }
  if (name === "delete_file") {
    const abs = inside(args.path);
    const rel = relative(workspace, abs);
    if (ctx.reviewWrites && ctx.runId) {
      readFileSync(abs, "utf8");
      const p = stageWrite(ctx.runId, rel, "");
      return `待审核删除补丁 ${p.id}：${rel}`;
    }
    if (ctx.runId) applyWriteImmediate(ctx.runId, rel, readFileSync(abs, "utf8"));
    unlinkSync(abs);
    return `已删除 ${rel}`;
  }
  if (name === "glob_file_search") {
    const hits = fg.sync(args.pattern, { cwd: workspace, onlyFiles: true, dot: false });
    return hits
      .filter((h) => !isIgnored(h))
      .slice(0, 200)
      .join("\n");
  }
  if (name === "list_dir") {
    const abs = inside(args.path || ".");
    const base = relative(workspace, abs) || ".";
    return readdirSync(abs)
      .filter((n) => !isIgnored(base === "." ? n : `${base}/${n}`))
      .map((name) => {
        const s = statSync(join(abs, name));
        return `${s.isDirectory() ? "d" : "f"} ${name}`;
      })
      .join("\n");
  }
  if (name === "grep") {
    const r = spawnSync(
      "rg",
      ["-n", "--glob", args.glob || "*", "--glob", "!node_modules/**", args.pattern, workspace],
      { encoding: "utf8", maxBuffer: 2_000_000 }
    );
    if (r.error) return `rg 不可用: ${r.error.message}`;
    const lines = (r.stdout || "")
      .split("\n")
      .filter((line) => {
        const rel = line.split(":")[0]?.replace(workspace + "/", "");
        return rel && !isIgnored(rel);
      });
    return (lines.join("\n") || r.stderr || "(无匹配)").slice(0, 20_000);
  }
  if (name === "shell") {
    if (!ctx.allowDangerousShell && isDangerousShell(args.command)) {
      return "危险命令已拦截。请在聊天勾选「允许危险 shell」后重试，或改用更安全的命令。";
    }
    const out = execFileSync("bash", ["-lc", args.command], {
      cwd: workspace,
      encoding: "utf8",
      maxBuffer: 2_000_000,
    });
    return (out || "(无输出)").slice(0, 20_000);
  }
  if (name === "read_lints") {
    const r = spawnSync("npm", ["run", "typecheck"], { cwd: workspace, encoding: "utf8", maxBuffer: 2_000_000 });
    let out = `${r.stdout || ""}${r.stderr || ""}`.trim() || "无诊断";
    if (args.path) {
      out = out
        .split("\n")
        .filter((l) => l.includes(args.path))
        .join("\n");
    }
    return out.slice(0, 20_000) || "无匹配诊断";
  }
  if (name === "codebase_search") {
    const words = (args.query || "")
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 5);
    if (!words.length) return "query 太短";
    const lines: string[] = [];
    for (const w of words) {
      const r = spawnSync(
        "rg",
        ["-n", "--glob", "!node_modules/**", w, workspace],
        { encoding: "utf8", maxBuffer: 2_000_000 }
      );
      if (r.stdout) {
        for (const line of r.stdout.split("\n")) {
          const rel = line.split(":")[0]?.replace(workspace + "/", "");
          if (rel && !isIgnored(rel)) lines.push(line);
        }
      }
    }
    const uniq = [...new Set(lines)];
    return (uniq.slice(0, 80).join("\n") || "(无匹配)").slice(0, 20_000);
  }
  return `未知工具 ${name}`;
}
