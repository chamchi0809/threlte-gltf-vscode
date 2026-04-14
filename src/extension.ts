import * as vscode from 'vscode';
import { PanelProvider } from './panel';

export function activate(context: vscode.ExtensionContext) {
  const provider = new PanelProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('threlte-gltf.panel', provider)
  );
}

export function deactivate() {}
