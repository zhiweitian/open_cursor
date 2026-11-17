import * as vscode from "vscode";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  acceptPatch,
  createRun,
  rejectPatch,
  runAgent,
  setConfigOverride,
  setWorkspace,
} from "@opencursor/agent-core";

export class ChatViewProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;
  private runId?: string;

  constructor(private readonly extUri: vscode.Uri) {}

  newChat() {
    this.runId = undefined;
    this.view?.webview.postMessage({ type: "clear" });
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extUri, "web")],
    };
    webviewView.webview.html = this.html(webviewView.webview);
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === "chat") {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!root) {
          webviewView.webview.postMessage({ type: "error", text: "请先打开文件夹工作区" });
          return;
        }
        setWorkspace(root);
        const cfg = vscode.workspace.getConfiguration("openCursor");
        setConfigOverride({
          apiKey: cfg.get<string>("apiKey") || process.env.DEEPSEEK_API_KEY || "",
          baseUrl: cfg.get<string>("baseUrl") || "https://api.deepseek.com",
          model: cfg.get<string>("model") || "deepseek-flash",
          thinking: cfg.get<boolean>("thinking") || false,
        });
        const run = createRun();
        this.runId = run.id;
        try {
          const out = await runAgent(String(msg.text || ""), {
            runId: run.id,
            reviewWrites: msg.reviewWrites !== false,
            allowDangerousShell: Boolean(msg.allowDangerousShell),
          });
          webviewView.webview.postMessage({ type: "result", ...out, runId: run.id });
        } catch (e) {
          webviewView.webview.postMessage({
            type: "error",
            text: e instanceof Error ? e.message : String(e),
          });
        }
      }
      if (msg.type === "accept" && this.runId) {
        acceptPatch(this.runId, msg.patchId);
        webviewView.webview.postMessage({ type: "patchDone", patchId: msg.patchId });
      }
      if (msg.type === "reject" && this.runId) {
        rejectPatch(this.runId, msg.patchId);
        webviewView.webview.postMessage({ type: "patchDone", patchId: msg.patchId });
      }
    });
  }

  private html(webview: vscode.Webview) {
    const dir = path.join(this.extUri.fsPath, "web");
    const css = fs.readFileSync(path.join(dir, "chat.css"), "utf8");
    const body = fs.readFileSync(path.join(dir, "chat.html"), "utf8");
    return `<!doctype html><html lang="zh"><head><meta charset="utf-8"/><style>${css}</style></head>${body}<script>const vscode=acquireVsCodeApi();${fs.readFileSync(path.join(dir, "chat.js"), "utf8")}</script></html>`;
  }
}
