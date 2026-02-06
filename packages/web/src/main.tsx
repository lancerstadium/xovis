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

// VSCode 扩展 webview：监听来自父窗口的文档更新
if (typeof window !== 'undefined' && window.self !== window.top) {
  window.addEventListener('message', async (e) => {
    if (e.data?.type === 'update' && typeof e.data.text === 'string') {
      const { useGraphStore } = await import('./stores');
      const { loadFile } = await import('./utils/loadFile');
      const result = loadFile(e.data.text);
      if (result.success) {
        useGraphStore.getState().setGraph(result.graph);
      } else {
        useGraphStore.getState().setGraph(null);
      }
    }
  });
}
