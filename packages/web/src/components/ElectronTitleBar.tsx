import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';

const TITLE_BAR_HEIGHT = 24;

export function ElectronTitleBar() {
  const api = window.electronAPI;
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!api?.windowControls?.isMaximized) return;
    const check = () => api.windowControls.isMaximized().then(setMaximized);
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [api]);

  // 仅 Electron 桌面端 Win/Linux 显示一体标题栏；浏览器无 electronAPI 不渲染，macOS 用系统栏
  if (!api || (api.platform !== 'win32' && api.platform !== 'linux')) return null;

  const { windowControls } = api;

  const barStyle: CSSProperties & { WebkitAppRegion?: string } = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: TITLE_BAR_HEIGHT,
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 12,
    paddingRight: 0,
    zIndex: 10000,
    WebkitAppRegion: 'drag',
  };
  const buttonsWrapStyle: CSSProperties & { WebkitAppRegion?: string } = {
    display: 'flex',
    height: '100%',
    WebkitAppRegion: 'no-drag',
  };

  return (
    <div className="electron-title-bar" style={barStyle}>
      <span style={{ fontSize: 12, color: 'var(--text2)', userSelect: 'none' }}>xovis</span>
      <div style={buttonsWrapStyle}>
        <button
          type="button"
          className="electron-title-btn"
          onClick={() => windowControls.minimize()}
          aria-label="Minimize"
        >
          <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor">
            <rect x={0} y={5} width={12} height={1} />
          </svg>
        </button>
        <button
          type="button"
          className="electron-title-btn"
          onClick={() => windowControls.toggleMaximize()}
          aria-label={maximized ? 'Restore' : 'Maximize'}
        >
          {maximized ? (
            <svg width={12} height={12} viewBox="0 0 12 12" fill="currentColor">
              <rect x={2} y={0} width={8} height={8} stroke="currentColor" strokeWidth={1} fill="none" />
              <rect x={0} y={2} width={8} height={8} stroke="currentColor" strokeWidth={1} fill="none" />
            </svg>
          ) : (
            <svg width={12} height={12} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1}>
              <rect x={0} y={0} width={12} height={12} />
            </svg>
          )}
        </button>
        <button
          type="button"
          className="electron-title-btn electron-title-btn-close"
          onClick={() => windowControls.close()}
          aria-label="Close"
        >
          <svg width={12} height={12} viewBox="0 0 12 12" stroke="currentColor" strokeWidth={1.5}>
            <path d="M1 1l10 10M11 1L1 11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
