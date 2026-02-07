import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
          <h2>渲染出错</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {this.state.err.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

async function bootstrap() {
  const graphlib = await import('@dagrejs/graphlib');
  // @dagrejs/dagre 内部 require('@dagrejs/graphlib')，ESM 下需垫片
  (globalThis as unknown as { require: (id: string) => unknown }).require = (id: string) =>
    id === '@dagrejs/graphlib' ? graphlib : undefined;
  const { default: App } = await import('./App');
  const root = document.getElementById('root');
  if (root) {
    try {
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </React.StrictMode>
      );
    } catch (e) {
      root.innerHTML = `<div style="padding:24px;font-family:sans-serif"><h2>启动失败</h2><pre>${e instanceof Error ? e.message : String(e)}</pre></div>`;
    }
  }
}
bootstrap();

// VSCode 扩展 webview：监听文档更新与扩展发来的加载文件
function handleVscodeUpdate(e: MessageEvent) {
  const d = e.data;
  if (d?.type === 'update' && typeof d.text === 'string') {
    import('./stores').then(({ useGraphStore }) =>
      import('./utils/loadFile').then(({ loadFile }) => {
        const result = loadFile(d.text);
        if (result.success) useGraphStore.getState().setGraph(result.graph);
        else useGraphStore.getState().setGraph(null);
      })
    );
    return;
  }
  if (d?.type === 'loadFile' && typeof d.content === 'string') {
    import('./stores').then(({ useGraphStore, useSettingsStore }) =>
      import('./utils/loadFile').then(({ loadFile }) => {
        const result = loadFile(d.content, d.fileName);
        if (result.success) {
          useGraphStore.getState().setGraph(result.graph);
          if (result.source === 'csv') useSettingsStore.getState().set({ viewMode: 'bar' });
        } else {
          useGraphStore.getState().setGraph(null);
        }
      })
    );
  }
}
if (typeof window !== 'undefined') {
  if (window.self !== window.top) {
    window.addEventListener('message', handleVscodeUpdate);
  } else if (
    (window as unknown as { __XOVIS_VSCODE_WEBVIEW__?: boolean }).__XOVIS_VSCODE_WEBVIEW__
  ) {
    window.addEventListener('message', handleVscodeUpdate);
    // 有初始数据时立即应用
    const initial = (window as unknown as { __XOVIS_INITIAL_TEXT?: string | null })
      .__XOVIS_INITIAL_TEXT;
    if (initial != null) {
      import('./stores').then(({ useGraphStore }) =>
        import('./utils/loadFile').then(({ loadFile }) => {
          const result = loadFile(initial);
          if (result.success) useGraphStore.getState().setGraph(result.graph);
          else useGraphStore.getState().setGraph(null);
        })
      );
    }
  }
}
