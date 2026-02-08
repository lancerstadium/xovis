import { useRef, useState, useEffect } from 'react';
import { useGraphStore, useSettingsStore, useElectronTabsStore } from '../stores';
import { getLocale } from '../locale';
import { loadFile } from '../utils/loadFile';

// 使用 BASE_URL 确保在 GitHub Pages 部署时路径正确
const BASE_URL = import.meta.env.BASE_URL || '/';

const EXAMPLES = [
  { value: 'example-graph.json', path: `${BASE_URL}examples/models/example-graph.json` },
  { value: 'example-complete.json', path: `${BASE_URL}examples/models/example-complete.json` },
] as const;

const ICON_SVG = {
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function Loader() {
  const comboRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const { setGraph } = useGraphStore();
  const { lang, set, viewMode } = useSettingsStore();
  const t = getLocale(lang);

  const load = (text: string, fileName?: string) => {
    const label = fileName ? fileName.replace(/^.*[/\\]/, '') : t.tabUntitled;
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    if (isElectron && label !== t.tabUntitled) {
      const { tabs, setActive } = useElectronTabsStore.getState();
      const sameTab = tabs.find((tab) => tab.label === label);
      if (sameTab) {
        setActive(sameTab.id);
        setGraph(sameTab.graph ?? null);
        setError(null);
        return;
      }
    }
    const result = loadFile(text, fileName);
    if (result.success) {
      setGraph(result.graph);
      setError(null);
      if (isElectron) {
        const aid = useElectronTabsStore.getState().activeId;
        if (aid) {
          useElectronTabsStore.getState().setTabLabel(aid, label);
        }
      }
      // 如果是CSV文件，自动切换到图表视图
      if (result.source === 'csv' && viewMode === 'graph') {
        set({ viewMode: 'bar' });
      }
    } else {
      setError(result.error);
      setGraph(null);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      load(await file.text(), file.name);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onExample = async (path: string) => {
    if (!path) return;
    setExamplesOpen(false);
    setLoading(true);
    setError(null);
    try {
      const url = path.startsWith('http') ? path : new URL(path, window.location.origin).href;
      const res = await fetch(url);
      if (!res.ok) throw new Error(res.statusText);
      load(await res.text(), path);
    } catch {
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  };

  const openFileDialog = () => {
    setExamplesOpen(false);
    if (loading) return;
    const vscodeRequestLoad = typeof window !== 'undefined' && (window as unknown as { __XOVIS_VSCODE_REQUEST_LOAD?: () => void }).__XOVIS_VSCODE_REQUEST_LOAD;
    if (vscodeRequestLoad) {
      vscodeRequestLoad();
      return;
    }
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  useEffect(() => {
    if (!examplesOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (comboRef.current?.contains(e.target as Node)) return;
      setExamplesOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('click', onDocClick), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onDocClick);
    };
  }, [examplesOpen]);

  return (
    <div ref={comboRef} className="loader-combo">
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json,.csv,text/csv"
        onChange={onFile}
        style={{ display: 'none' }}
        aria-label={t.loadSelectFile}
      />
      <div className="loader-examples-wrap" style={{ position: 'relative' }}>
        <button
          type="button"
          className="btn icon-btn"
          onClick={() => setExamplesOpen((v) => !v)}
          disabled={loading}
          title={t.loadExample}
          aria-label={t.loadExample}
          aria-expanded={examplesOpen}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            {...ICON_SVG}
            aria-hidden="true"
          >
            <polyline points="6 15 12 9 18 15" />
          </svg>
        </button>
        {examplesOpen && (
          <div className="loader-dropdown float-dropdown" role="menu">
            <div className="panel-glass">
              <div className="panel-menu">
                <button
                  type="button"
                  className="panel-menu-item"
                  role="menuitem"
                  onClick={openFileDialog}
                >
                  {t.loadImportFile}
                </button>
                {EXAMPLES.map(({ value, path }) => (
                  <button
                    key={path}
                    type="button"
                    className="panel-menu-item"
                    role="menuitem"
                    onClick={() => onExample(path)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {error && <span className="loader-error">{error}</span>}
    </div>
  );
}
