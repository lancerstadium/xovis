import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

let editorPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('xovis.focusView', () => {
      openOrRevealPanel(context.extensionUri);
    })
  );
}

function openOrRevealPanel(extensionUri: vscode.Uri): void {
  const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
  if (editorPanel) {
    editorPanel.reveal(column);
    return;
  }
  editorPanel = vscode.window.createWebviewPanel('xovis.panel', 'xovis', column, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
  });
  const imagesDir = vscode.Uri.joinPath(extensionUri, 'images');
  editorPanel.iconPath = {
    light: vscode.Uri.joinPath(imagesDir, 'favicon-raw-light.svg'),
    dark: vscode.Uri.joinPath(imagesDir, 'favicon-raw-dark.svg'),
  };
  editorPanel.webview.html = getHtmlForWebview(editorPanel.webview, extensionUri, null);

  const updateFavicon = () => {
    editorPanel?.webview.postMessage({
      type: 'theme',
      favicon: 'favicon-raw.svg',
    });
  };
  const themeSub = vscode.window.onDidChangeActiveColorTheme(updateFavicon);

  editorPanel.webview.onDidReceiveMessage(
    async (message: {
      type: string;
      uri?: string;
      format?: string;
      content?: string;
      suggestedName?: string;
      fileName?: string;
    }) => {
      if (message.type === 'requestLoadFile') {
        const uris = await vscode.window.showOpenDialog({
          canSelectMany: false,
          filters: { JSON: ['json'], CSV: ['csv'] },
        });
        if (!uris?.length) return;
        try {
          const buf = await vscode.workspace.fs.readFile(uris[0]);
          const content = Buffer.from(buf).toString('utf-8');
          const fileName = path.basename(uris[0].fsPath) || 'file.json';
          editorPanel?.webview.postMessage({ type: 'loadFile', content, fileName });
        } catch (e) {
          vscode.window.showErrorMessage(`读取失败: ${e instanceof Error ? e.message : String(e)}`);
        }
        return;
      }
      if (message.type === 'loadFileFromUri' && typeof message.uri === 'string') {
        try {
          const uri = vscode.Uri.parse(message.uri);
          const buf = await vscode.workspace.fs.readFile(uri);
          const content = Buffer.from(buf).toString('utf-8');
          const fileName = path.basename(uri.fsPath) || 'file.json';
          editorPanel?.webview.postMessage({ type: 'loadFile', content, fileName });
        } catch (e) {
          vscode.window.showErrorMessage(`读取失败: ${e instanceof Error ? e.message : String(e)}`);
        }
        return;
      }
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
    }
  );

  editorPanel.onDidDispose(() => {
    themeSub.dispose();
    editorPanel = undefined;
  });
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
  const faviconName = 'favicon-raw.svg';
  html = html.replace(/favicon\.svg/g, faviconName);
  html = html.replace(
    /<link[^>]*rel=["']icon["'][^>]*>/i,
    `<link rel="icon" type="image/svg+xml" href="${baseSlash}${faviconName}">`
  );

  const csp = [
    `default-src ${webview.cspSource}`,
    `script-src 'unsafe-inline' 'unsafe-eval' ${webview.cspSource}`,
    `style-src 'unsafe-inline' ${webview.cspSource}`,
    `img-src data: ${webview.cspSource}`,
    `connect-src ${webview.cspSource}`,
    `font-src ${webview.cspSource}`,
  ].join('; ');
  const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}">`;
  const vscodeFillStyle = `<style id="xovis-webview-fill">html,body,#root,#root>div,.app,.main{width:100%!important;height:100%!important;margin:0!important;padding:0!important;box-sizing:border-box;}html,body{overflow:hidden!important;min-height:100%!important;}</style>`;
  // acquireVsCodeApi() 只能调用一次，且须在 webview 就绪后调用；这里采用首次使用时再获取并缓存
  const initialScript = `<script>(function(){var k='__xovisVsCodeApi';window.__XOVIS_INITIAL_TEXT=${initialText !== null ? JSON.stringify(initialText) : 'null'};window.__XOVIS_VSCODE_WEBVIEW__=true;window.__XOVIS_MEDIA_BASE=${JSON.stringify(baseSlash)};function getApi(){if(!window[k]){try{window[k]=typeof acquireVsCodeApi!=='undefined'?acquireVsCodeApi():null;}catch(e){window[k]=null;}}return window[k];}window.__XOVIS_VSCODE_SAVE=function(p){var api=getApi();if(api)api.postMessage(p);};window.__XOVIS_VSCODE_REQUEST_LOAD=function(){var api=getApi();if(api)api.postMessage({type:'requestLoadFile'});};window.__XOVIS_VSCODE_REQUEST_LOAD_URI=function(uri){var api=getApi();if(api&&uri)api.postMessage({type:'loadFileFromUri',uri:uri});};})();</script>`;
  const dropScript = `<script>document.addEventListener('dragover',function(e){e.preventDefault();},{passive:false});document.addEventListener('drop',function(e){e.preventDefault();},{passive:false});</script>`;
  const themeScript = `<script>window.addEventListener('message', function(e){if(e.data&&e.data.type==='theme'&&e.data.favicon){var l=document.querySelector('link[rel="icon"]');if(l&&window.__XOVIS_MEDIA_BASE)l.href=window.__XOVIS_MEDIA_BASE+e.data.favicon;}});</script>`;
  html = html.replace('<head>', '<head>\n' + baseTag);
  html = html.replace(
    '</head>',
    `${cspMeta}\n${vscodeFillStyle}\n${initialScript}\n${dropScript}\n${themeScript}\n</head>`
  );
  return html;
}

export function deactivate() {
  editorPanel?.dispose();
  editorPanel = undefined;
}
