import * as vscode from 'vscode';
import { exec } from 'child_process';

export class PanelProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview'),
      ],
    };

    webview.html = this.getHtml(webview);

    // Send workspace public-folder path for auto-root
    const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (wsFolder) {
      webview.postMessage({
        type: 'workspacePublicPath',
        path: wsFolder.replace(/\\/g, '/') + '/public',
      });
    }

    webview.onDidReceiveMessage(async (msg) => {
      switch (msg.type) {
        case 'pickFile': {
          const uri = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            filters: { 'GLTF/GLB': ['gltf', 'glb'] },
            title: 'Select GLTF/GLB Model',
          });
          if (uri?.[0]) {
            webview.postMessage({
              type: 'filePicked',
              field: msg.field,
              path: uri[0].fsPath,
            });
          }
          break;
        }
        case 'pickOutput': {
          const uri = await vscode.window.showSaveDialog({
            filters: { Svelte: ['svelte'] },
            title: 'Save Output Component',
          });
          if (uri) {
            webview.postMessage({
              type: 'filePicked',
              field: msg.field,
              path: uri.fsPath,
            });
          }
          break;
        }
        case 'pickFolder': {
          const uri = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            title: msg.title ?? 'Select Folder',
          });
          if (uri?.[0]) {
            webview.postMessage({
              type: 'filePicked',
              field: msg.field,
              path: uri[0].fsPath,
            });
          }
          break;
        }
        case 'run': {
          this.runCommand(msg.command, webview);
          break;
        }
        case 'openFile': {
          const doc = await vscode.workspace.openTextDocument(msg.path);
          await vscode.window.showTextDocument(doc);
          break;
        }
      }
    });
  }

  private runCommand(command: string, webview: vscode.Webview) {
    const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    webview.postMessage({ type: 'log', text: `$ ${command}\n` });

    const proc = exec(command, { cwd: cwd ?? undefined });

    proc.stdout?.on('data', (data: string) => {
      webview.postMessage({ type: 'log', text: data });
    });
    proc.stderr?.on('data', (data: string) => {
      webview.postMessage({ type: 'log', text: data });
    });
    proc.on('close', (code: number | null) => {
      webview.postMessage({ type: 'done', code });
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const distUri = vscode.Uri.joinPath(
      this.extensionUri,
      'dist',
      'webview'
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(distUri, 'assets', 'index.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
