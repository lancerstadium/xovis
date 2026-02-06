import * as vscode from 'vscode';
import { parseGraph } from '@xovis/core';

export function activate(context: vscode.ExtensionContext) {
  // 注册自定义编辑器提供者
  const provider = new GraphEditorProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('xovis.graph', provider)
  );

  // 注册命令
  const openCommand = vscode.commands.registerCommand('xovis.open', async () => {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      vscode.window.showWarningMessage('请先打开一个 JSON 文件');
      return;
    }

    const document = activeEditor.document;
    if (document.languageId !== 'json') {
      vscode.window.showWarningMessage('当前文件不是 JSON 格式');
      return;
    }

    try {
      const text = document.getText();
      parseGraph(text); // 验证 JSON 格式
      
      // 打开自定义编辑器
      await vscode.commands.executeCommand('vscode.openWith', document.uri, 'xovis.graph');
    } catch (error) {
      vscode.window.showErrorMessage(`解析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  context.subscriptions.push(openCommand);
}

class GraphEditorProvider implements vscode.CustomTextEditorProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };

    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, document);

    // 监听文档变化
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        this.updateWebview(webviewPanel.webview, document);
      }
    });

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    // 处理来自 webview 的消息
    webviewPanel.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case 'ready':
          this.updateWebview(webviewPanel.webview, document);
          break;
      }
    });
  }

  private updateWebview(webview: vscode.Webview, document: vscode.TextDocument) {
    webview.postMessage({
      type: 'update',
      text: document.getText(),
    });
  }

  private getHtmlForWebview(webview: vscode.Webview, document: vscode.TextDocument): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'main.css')
    );

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet">
    <title>xovis 可视化</title>
</head>
<body>
    <div id="root"></div>
    <script>
        const vscode = acquireVsCodeApi();
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'update':
                    // 这里可以调用 xovis 的解析和渲染逻辑
                    console.log('Graph data updated', message.text);
                    break;
            }
        });
        vscode.postMessage({ type: 'ready' });
    </script>
    <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}

export function deactivate() {}
