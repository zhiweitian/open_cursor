import * as vscode from "vscode";
import { ChatViewProvider } from "./chatView";

export function activate(context: vscode.ExtensionContext) {
  const provider = new ChatViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("opencursor.chat", provider, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
    vscode.commands.registerCommand("opencursor.openChat", () => {
      vscode.commands.executeCommand("opencursor.chat.focus");
    }),
    vscode.commands.registerCommand("opencursor.newChat", () => provider.newChat()),
  );
}

export function deactivate() {}
