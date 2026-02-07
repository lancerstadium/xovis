import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const sidebarProvider = new XovisSidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('xovis.view', sidebarProvider)
  );

  const focusCommand = vscode.commands.registerCommand('xovis.focusView', () => {
    vscode.commands.executeCommand('xovis.view.focus');
  });
  context.subscriptions.push(focusCommand);
}

function getFaviconForTheme(): string {
  const kind = vscode.window.activeColorTheme?.kind ?? vscode.ColorThemeKind.Dark;
  return kind === vscode.ColorThemeKind.Light ? 'favicon-app.svg' : 'favicon-dark.svg';
}

function getHtmlForWebview(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  initialText: string | null
): string {
  const mediaPath = path.join(extensionUri.fsPath, 'media', 'index.html');
  let html: string;
  try {
    html = fs.readFileSync(mediaPath, 'utf-8');
  } catch (e) {
    return `<!DOCTYPE html><html><body><p>无法加载 media/index.html</p><pre>${String(e)}</pre></body></html>`;
  }
  const baseUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media')).toString();
  const baseSlash = baseUri.endsWith('/') ? baseUri : baseUri + '/';
  const baseTag = `<base href="${baseSlash}">`;
  html = html
    .replace(/src="\.\//g, `src="${baseSlash}`)
    .replace(/href="\.\//g, `href="${baseSlash}`);
  const faviconName = getFaviconForTheme();
  html = html.replace(/favicon\.svg/g, faviconName);

  const csp = [
    `default-src ${webview.cspSource}`,
    `script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource}`,
    `style-src 'unsafe-inline' ${webview.cspSource}`,
    `img-src data: ${webview.cspSource}`,
    `connect-src ${webview.cspSource}`,
    `font-src ${webview.cspSource}`,
  ].join('; ');
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}">`;
  const initialScript = `<script>window.__XOVIS_INITIAL_TEXT = ${initialText !== null ? JSON.stringify(initialText) : 'null'};window.__XOVIS_VSCODE_WEBVIEW__ = true;window.__XOVIS_MEDIA_BASE = ${JSON.stringify(baseSlash)};window.__XOVIS_VSCODE_SAVE = function(p){var api = typeof acquireVsCodeApi !== 'undefined' && acquireVsCodeApi();if(api)api.postMessage(p);};</script>`;
  const themeScript = `<script>window.addEventListener('message', function(e){if(e.data&&e.data.type==='theme'&&e.data.favicon){var l=document.querySelector('link[rel="icon"]');if(l&&window.__XOVIS_MEDIA_BASE)l.href=window.__XOVIS_MEDIA_BASE+e.data.favicon;}});</script>`;
  html = html.replace('<head>', '<head>\n' + baseTag);
  html = html.replace('</head>', `${cspMeta}\n${initialScript}\n${themeScript}\n</head>`);
  return html;
}

class XovisSidebarProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
      ...({ retainContextWhenHidden: true } as vscode.WebviewOptions),
    };

    webviewView.webview.html = getHtmlForWebview(webviewView.webview, this.extensionUri, null);

    const updateFavicon = () => {
      webviewView.webview.postMessage({
        type: 'theme',
        favicon: getFaviconForTheme(),
      });
    };
    const themeSubscription = vscode.window.onDidChangeActiveColorTheme(updateFavicon);
    webviewView.onDidDispose(() => themeSubscription.dispose());

    webviewView.webview.onDidReceiveMessage(async (message: { type: string; format?: string; content?: string; suggestedName?: string }) => {
      if (message.type !== 'save' || message.content === undefined) return;
      const { format, content, suggestedName } = message;
      const defaultName = suggestedName ?? (format === 'json' ? 'graph.json' : 'export.svg');
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(defaultName),
        filters:
          format === 'json'
            ? { JSON: ['json'] }
            : format === 'svg'
              ? { SVG: ['svg'] }
              : format === 'pdf'
                ? { PDF: ['pdf'] }
                : { Images: ['png', 'jpg', 'jpeg', 'webp'] },
      });
      if (!uri) return;
      try {
        const dataUrlMatch = /^data:[\w+\-.]+\/[\w+\-.]+;base64,(.+)$/s.exec(content);
        if (dataUrlMatch) {
          const buf = Buffer.from(dataUrlMatch[1], 'base64');
          await vscode.workspace.fs.writeFile(uri, buf);
        } else {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        }
        vscode.window.showInformationMessage(`已保存: ${uri.fsPath}`);
      } catch (e) {
        vscode.window.showErrorMessage(`保存失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    });
  }
}

export function deactivate() {}
