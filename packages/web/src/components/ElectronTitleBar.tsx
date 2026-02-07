import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useElectronTabsStore } from '../stores';

const TITLE_BAR_HEIGHT = 18;

export function ElectronTitleBar() {
  const api = window.electronAPI;
  const [maximized, setMaximized] = useState(false);
  const { tabs, activeId, addTab, closeTab, setActive } = useElectronTabsStore();

  useEffect(() => {
    if (!api?.windowControls?.isMaximized) return;
    const check = () => api.windowControls.isMaximized().then(setMaximized);
    check();
    const interval = setInterval(check, 500);
    return () => clearInterval(interval);
  }, [api]);

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
    alignItems: 'stretch',
    paddingLeft: 0,
    paddingRight: 0,
    zIndex: 10000,
    WebkitAppRegion: 'drag',
  };

  const tabsWrapStyle: CSSProperties & { WebkitAppRegion?: string } = {
    display: 'flex',
    alignItems: 'stretch',
    flex: 1,
    minWidth: 0,
    WebkitAppRegion: 'drag',
  };

  const buttonsWrapStyle: CSSProperties & { WebkitAppRegion?: string } = {
    display: 'flex',
    height: '100%',
    flexShrink: 0,
    WebkitAppRegion: 'no-drag',
  };

  return (
    <div className="electron-title-bar" style={barStyle}>
      <div style={tabsWrapStyle} className="electron-title-bar-tabs">
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeId}
            onSelect={() => setActive(tab.id)}
            onClose={() => closeTab(tab.id)}
            canClose={tabs.length > 1}
          />
        ))}
        <button
          type="button"
          className="electron-title-tab-add"
          onClick={(e) => {
            e.stopPropagation();
            addTab();
          }}
          aria-label="新标签页"
          title="新标签页"
        >
          +
        </button>
      </div>
      <div style={buttonsWrapStyle}>
        <button
          type="button"
          className="electron-title-btn"
          onClick={() => windowControls.minimize()}
          aria-label="Minimize"
        >
          <svg width={10} height={10} viewBox="0 0 12 12" fill="currentColor">
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
            <svg width={10} height={10} viewBox="0 0 12 12" fill="currentColor">
              <rect x={2} y={0} width={8} height={8} stroke="currentColor" strokeWidth={1} fill="none" />
              <rect x={0} y={2} width={8} height={8} stroke="currentColor" strokeWidth={1} fill="none" />
            </svg>
          ) : (
            <svg width={10} height={10} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1}>
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
          <svg width={10} height={10} viewBox="0 0 12 12" stroke="currentColor" strokeWidth={1.5}>
            <path d="M1 1l10 10M11 1L1 11" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function TabItem({
  tab,
  isActive,
  onSelect,
  onClose,
  canClose,
}: {
  tab: { id: string; label: string };
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
  canClose: boolean;
}) {
  const [hover, setHover] = useState(false);

  const style: CSSProperties & { WebkitAppRegion?: string } = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    height: '100%',
    paddingLeft: 8,
    paddingRight: 4,
    maxWidth: 120,
    minWidth: 0,
    border: 'none',
    background: isActive ? 'var(--toolbarBg)' : 'transparent',
    color: isActive ? 'var(--text)' : 'var(--text2)',
    fontSize: 11,
    cursor: 'pointer',
    flexShrink: 0,
    WebkitAppRegion: 'no-drag',
  };

  return (
    <div
      role="tab"
      aria-selected={isActive}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="electron-title-tab"
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab.label}</span>
      {canClose && (
        <button
          type="button"
          className="electron-title-tab-close"
          aria-label="关闭"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            visibility: hover ? 'visible' : 'hidden',
            width: 14,
            height: 14,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--text2)',
            borderRadius: 2,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width={8} height={8} viewBox="0 0 8 8" stroke="currentColor" strokeWidth={1.5}>
            <path d="M1 1l6 6M7 1L1 7" />
          </svg>
        </button>
      )}
    </div>
  );
}
