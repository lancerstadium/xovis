import { useState, useEffect } from 'react';
import { getLocale } from '../locale';
import { useSettingsStore } from '../stores';

const PWA_DISMISS_KEY = 'xovis-pwa-install-dismissed';

const isIos =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' &&
      (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1));

const isHarmony =
  typeof navigator !== 'undefined' &&
  /HarmonyOS|HMSCore|HUAWEI|Honor/i.test(navigator.userAgent);

export function PwaInstallBanner() {
  const lang = useSettingsStore((s) => s.lang);
  const t = getLocale(lang);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.electronAPI) return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem(PWA_DISMISS_KEY) === '1') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (isIos || isHarmony) {
      setShow(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const onInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    installPrompt.userChoice.then(({ outcome }) => {
      if (outcome === 'accepted') setShow(false);
    });
    setInstallPrompt(null);
    setShow(false);
  };

  const onDismiss = () => {
    localStorage.setItem(PWA_DISMISS_KEY, '1');
    setShow(false);
  };

  useEffect(() => {
    document.body.classList.toggle('pwa-banner-visible', show);
    return () => document.body.classList.remove('pwa-banner-visible');
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="pwa-install-banner"
      role="banner"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: '8px 12px',
        paddingTop: 'calc(8px + env(safe-area-inset-top, 0px))',
        paddingLeft: 'calc(12px + env(safe-area-inset-left, 0px))',
        paddingRight: 'calc(12px + env(safe-area-inset-right, 0px))',
        background: 'var(--toolbar-bg)',
        color: 'var(--toolbar-text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 13,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span>
        xovis ·{' '}
        {installPrompt
          ? t.pwaInstallPrompt
          : isHarmony
            ? t.pwaInstallHarmonyHint
            : t.pwaInstallIosHint}
      </span>
      <div style={{ display: 'flex', gap: 8 }}>
        {installPrompt != null && (
          <button
            type="button"
            className="btn"
            onClick={onInstall}
            style={{
              padding: '4px 12px',
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            {t.pwaInstallPrompt}
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={onDismiss}
          style={{
            padding: '4px 12px',
            background: 'transparent',
            color: 'var(--toolbar-text)',
            border: '1px solid currentColor',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          {t.pwaInstallDismiss}
        </button>
      </div>
    </div>
  );
}
