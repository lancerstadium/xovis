import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../stores';
import {
  themeToMode,
  themeToPresetNum,
  modeAndPresetToTheme,
  THEME_PRESET_NUMS,
} from '../stores/settings';
import { getLocale } from '../locale';
import type { Lang } from '../locale';

type ColorKey =
  | 'bg'
  | 'bgTarget'
  | 'bgSidebar'
  | 'border'
  | 'text'
  | 'text2'
  | 'accent'
  | 'toolbarBg'
  | 'toolbarHover'
  | 'nodeFill'
  | 'nodeStroke'
  | 'nodeTextColor'
  | 'nodeAttrFill'
  | 'tensorFill'
  | 'tensorStroke'
  | 'edgeStroke';

const UI_COLORS: ColorKey[] = [
  'bg',
  'bgTarget',
  'bgSidebar',
  'border',
  'text',
  'text2',
  'accent',
  'toolbarBg',
  'toolbarHover',
];
const GRAPH_COLORS: ColorKey[] = [
  'nodeFill',
  'nodeStroke',
  'nodeTextColor',
  'nodeAttrFill',
  'tensorFill',
  'tensorStroke',
  'edgeStroke',
];
const COLOR_LABELS: Record<ColorKey, keyof ReturnType<typeof getLocale>> = {
  bg: 'colorBg',
  bgTarget: 'colorBgTarget',
  bgSidebar: 'colorBgSidebar',
  border: 'colorBorder',
  text: 'colorText',
  text2: 'colorText2',
  accent: 'colorAccent',
  toolbarBg: 'colorToolbarBg',
  toolbarHover: 'colorToolbarHover',
  nodeFill: 'colorNodeFill',
  nodeStroke: 'colorNodeStroke',
  nodeTextColor: 'colorNodeTextColor',
  nodeAttrFill: 'colorNodeAttrFill',
  tensorFill: 'colorTensorFill',
  tensorStroke: 'colorTensorStroke',
  edgeStroke: 'colorEdgeStroke',
};

/** 字体样式：name 直接显示，nameKey 用 locale；value 为 font stack，下拉多选项 + 可编辑自定义 */
const FONT_OPTIONS: {
  name?: string;
  nameKey?: keyof ReturnType<typeof getLocale>;
  value: string;
}[] = [
  {
    nameKey: 'settingsFontSystem',
    value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Ubuntu, sans-serif',
  },
  { nameKey: 'settingsFontSans', value: 'system-ui, "Segoe UI", Roboto, sans-serif' },
  { nameKey: 'settingsFontMono', value: 'ui-monospace, "Cascadia Code", "Consolas", monospace' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { name: 'Segoe UI', value: '"Segoe UI", Tahoma, sans-serif' },
  { name: 'Consolas', value: 'Consolas, "Courier New", monospace' },
  { name: 'Courier New', value: '"Courier New", Courier, monospace' },
  { name: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { name: 'Calibri', value: 'Calibri, "Segoe UI", sans-serif' },
  { name: 'PingFang SC', value: '"PingFang SC", "Microsoft YaHei", sans-serif' },
  { name: 'Microsoft YaHei', value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { name: 'Source Han Sans', value: '"Source Han Sans SC", "PingFang SC", sans-serif' },
  { name: 'Noto Sans SC', value: '"Noto Sans SC", "PingFang SC", sans-serif' },
];
const FONT_CUSTOM_VALUE = '__custom__';

function fontOptionLabel(o: (typeof FONT_OPTIONS)[0], t: ReturnType<typeof getLocale>): string {
  return o.name ?? (o.nameKey ? t[o.nameKey] : o.value);
}

const TENSOR_ROLE_KEYS: (keyof ReturnType<typeof getLocale>)[] = [
  'colorTensorInput',
  'colorTensorOutput',
  'colorTensorWeight',
  'colorTensorActivation',
];

type SettingsState = ReturnType<typeof useSettingsStore.getState>;
const TEXT_STYLE_CHECK_ITEMS: Array<{
  labelKey: keyof ReturnType<typeof getLocale>;
  settingKey: keyof SettingsState;
  get: (s: SettingsState) => boolean;
}> = [
  { labelKey: 'settingsNodeNameBold', settingKey: 'nodeNameBold', get: (s) => s.nodeNameBold },
  {
    labelKey: 'settingsNodeNameItalic',
    settingKey: 'nodeNameItalic',
    get: (s) => s.nodeNameItalic,
  },
  { labelKey: 'settingsNodeAttrBold', settingKey: 'nodeAttrBold', get: (s) => s.nodeAttrBold },
  {
    labelKey: 'settingsNodeAttrItalic',
    settingKey: 'nodeAttrItalic',
    get: (s) => s.nodeAttrItalic,
  },
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel-row">
      <span className="panel-row-label">{label}</span>
      <span className="panel-row-value">{children}</span>
    </div>
  );
}

/** 并排选项行：与 panel-check-list 同排，标签 10px，复用 panel-option 布局 */
function PanelOptionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="panel-option panel-control-row">
      <span className="panel-option-label">{label}</span>
      <span className="panel-option-value">{children}</span>
    </div>
  );
}

/** 数字输入：本地状态 + blur/Enter 提交，可嵌入 Row 或 PanelOptionRow，统一字号/节点尺寸等行为 */
export function NumberInput({
  value,
  min,
  max,
  step = 1,
  defaultVal,
  onChange,
  className,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultVal: number;
  onChange: (n: number) => void;
  className?: string;
}) {
  const [local, setLocal] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setLocal(String(value));
  }, [value, focused]);
  const commit = () => {
    const n = Number(local);
    const clamped = Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : defaultVal;
    onChange(clamped);
    setLocal(String(clamped));
    setFocused(false);
  };
  return (
    <input
      type="number"
      className={className ?? 'view-input'}
      min={min}
      max={max}
      step={step}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}

function NumRow({
  label,
  value,
  min,
  max,
  step = 1,
  defaultVal,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultVal: number;
  onChange: (n: number) => void;
}) {
  return (
    <Row label={label}>
      <NumberInput
        value={value}
        min={min}
        max={max}
        step={step}
        defaultVal={defaultVal}
        onChange={onChange}
      />
    </Row>
  );
}

/** 双数字输入行：与 NumRow 同逻辑，用于节点宽高或导出尺寸 */
function NumPairRow({
  label,
  valueA,
  valueB,
  minA,
  maxA,
  stepA = 1,
  defaultA,
  minB,
  maxB,
  stepB = 1,
  defaultB,
  onChangeA,
  onChangeB,
  unitLabel,
  autoLabel,
}: {
  label: string;
  valueA: number;
  valueB: number;
  minA: number;
  maxA: number;
  stepA?: number;
  defaultA: number;
  minB: number;
  maxB: number;
  stepB?: number;
  defaultB: number;
  onChangeA: (n: number) => void;
  onChangeB: (n: number) => void;
  unitLabel?: string;
  autoLabel?: string;
}) {
  const showAuto = autoLabel && valueA === 0 && valueB === 0;
  return (
    <Row label={label}>
      <NumberInput
        value={valueA}
        min={minA}
        max={maxA}
        step={stepA}
        defaultVal={defaultA}
        onChange={onChangeA}
      />
      <span style={{ margin: '0 4px', fontSize: '12px', color: 'var(--text2)' }}>×</span>
      <NumberInput
        value={valueB}
        min={minB}
        max={maxB}
        step={stepB}
        defaultVal={defaultB}
        onChange={onChangeB}
      />
      {unitLabel && (
        <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--text2)' }}>
          {showAuto ? autoLabel : unitLabel}
        </span>
      )}
    </Row>
  );
}

/** 统一：名字在左、选框在右 */
function PanelCheck({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="panel-check panel-control-row" title={label} aria-label={label}>
      <span className="panel-check-label">{label}</span>
      <span className="panel-check-box-wrap">
        <input
          type="checkbox"
          className="panel-check-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="panel-check-box" aria-hidden />
      </span>
    </label>
  );
}

/** 一组复选框：从配置数组渲染，减少重复 */
function PanelCheckList({
  items,
  t,
  set,
}: {
  items: Array<{
    labelKey: keyof ReturnType<typeof getLocale>;
    settingKey: keyof ReturnType<typeof useSettingsStore.getState>;
    get: (s: ReturnType<typeof useSettingsStore.getState>) => boolean;
  }>;
  t: ReturnType<typeof getLocale>;
  set: (v: Partial<ReturnType<typeof useSettingsStore.getState>>) => void;
}) {
  return (
    <>
      {items.map(({ labelKey, settingKey, get }) => (
        <PanelCheck
          key={settingKey}
          label={t[labelKey]}
          checked={get(useSettingsStore.getState())}
          onChange={(v) =>
            set({ [settingKey]: v } as Partial<ReturnType<typeof useSettingsStore.getState>>)
          }
        />
      ))}
    </>
  );
}

/** 左右滑块开关：复用 panel-check 布局与选框同排对齐，点标签亦可切换 */
function PanelSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const toggle = () => onChange(!checked);
  return (
    <div className="panel-check panel-control-row" role="group" aria-label={label} onClick={toggle}>
      <span className="panel-check-label">{label}</span>
      <span className="panel-check-box-wrap">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          title={label}
          className="panel-switch-track"
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
        >
          <span className="panel-switch-thumb" />
        </button>
      </span>
    </div>
  );
}

function ColorItem({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hex = value.startsWith('#') ? value : `#${value}`;
  return (
    <div className="panel-row view-row-color">
      <label htmlFor={id} className="panel-row-label">
        {label}
      </label>
      <span className="panel-row-value">
        <input
          id={id}
          type="color"
          value={hex}
          onChange={(e) => onChange(e.target.value)}
          className="view-swatch"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="view-hex"
        />
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel-section">
      <div className="panel-section-title">{title}</div>
      {children}
    </div>
  );
}

type TabId = 'preset' | 'layout' | 'lines' | 'colors';

const TABS: { id: TabId; labelKey: keyof ReturnType<typeof getLocale> }[] = [
  { id: 'preset', labelKey: 'settingsTabPreset' },
  { id: 'layout', labelKey: 'settingsTabLayout' },
  { id: 'lines', labelKey: 'settingsTabLines' },
  { id: 'colors', labelKey: 'settingsTabColors' },
];

export function ViewMenu({
  open,
  onClose,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<TabId>('preset');
  const [resizing, setResizing] = useState(false);
  const [resizingHeight, setResizingHeight] = useState(false);
  const s = useSettingsStore();
  const t = getLocale(s.lang);

  const VIEW_MENU_HEIGHT_MIN = 200;
  const VIEW_MENU_HEIGHT_MAX = () => Math.min(Math.round(window.innerHeight * 0.8), 560);

  const [position, setPosition] = useState<{ top: number; left?: number; right?: number }>({
    top: 0,
    left: 0,
  });
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const isRight = rect.left > window.innerWidth / 2;
    setPosition({
      top: rect.bottom + 4,
      ...(isRight ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    });
  }, [open, anchorRef]);

  /** 与数据/详情浮窗一致：点击空白关闭（原 useClickOutside） */
  useEffect(() => {
    if (!open) return;
    const wrap = wrapRef.current;
    const anchor = anchorRef.current;
    const fn = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrap?.contains(target) || anchor?.contains(target)) return;
      onClose();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
    // refs 为稳定 ref 对象，不列入 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  useEffect(() => {
    if (!resizing) return;
    const VIEW_MENU_MIN = 220;
    const VIEW_MENU_MAX = Math.min(480, window.innerWidth * 0.9);
    const onMove = (e: MouseEvent) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const left = wrap.getBoundingClientRect().left;
      const w = Math.max(VIEW_MENU_MIN, Math.min(VIEW_MENU_MAX, e.clientX - left));
      s.set({ viewMenuWidth: w });
    };
    const onUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [resizing, s]);

  useEffect(() => {
    if (!resizingHeight) return;
    const onMove = (e: MouseEvent) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const top = wrap.getBoundingClientRect().top;
      const h = Math.max(VIEW_MENU_HEIGHT_MIN, Math.min(VIEW_MENU_HEIGHT_MAX(), e.clientY - top));
      s.set({ viewMenuHeight: h });
    };
    const onUp = () => {
      setResizingHeight(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [resizingHeight, s]);

  if (!open) return null;

  const fontSelectValue = FONT_OPTIONS.some((o) => o.value === s.fontFamily)
    ? s.fontFamily
    : FONT_CUSTOM_VALUE;
  const tensorRole = s.tensorRoleColors ?? ['#dbeafe', '#fed7aa', '#e9d5ff', '#bbf7d0'];

  const dropdown = (
    <div
      ref={wrapRef}
      className="view-dropdown-wrap view-dropdown-portal float-dropdown panel-glass"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left ?? 'auto',
        right: position.right !== undefined ? position.right : 'auto',
        width: s.viewMenuWidth,
        minWidth: 220,
        maxWidth: Math.min(480, typeof window !== 'undefined' ? window.innerWidth * 0.9 : 480),
        ...(s.viewMenuHeight > 0 ? { height: s.viewMenuHeight } : {}),
      }}
    >
      <div className="view-dropdown-row">
        <div className="view-dropdown">
          <div className="view-tabs">
            {TABS.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                className={tab === id ? 'view-tab active' : 'view-tab'}
                onClick={() => setTab(id)}
              >
                {t[labelKey]}
              </button>
            ))}
          </div>

          <div className="view-pane">
            {tab === 'preset' && (
              <div className="view-scroll panel-content">
                <Section title={t.settingsPreset}>
                  <div className="panel-check-list">
                    <PanelSwitch
                      label={t.settingsThemeMode}
                      checked={themeToMode(s.theme) === 'dark'}
                      onChange={(isDark) =>
                        s.applyPreset(
                          modeAndPresetToTheme(isDark ? 'dark' : 'light', themeToPresetNum(s.theme))
                        )
                      }
                    />
                    <PanelSwitch
                      label={t.settingsSilentMode}
                      checked={s.silentMode}
                      onChange={(v) => s.set({ silentMode: v })}
                    />
                  </div>
                  <div className="panel-check-list">
                    <PanelOptionRow label={t.settingsThemePreset}>
                      <select
                        className="view-input"
                        value={themeToPresetNum(s.theme)}
                        onChange={(e) =>
                          s.applyPreset(
                            modeAndPresetToTheme(themeToMode(s.theme), Number(e.target.value))
                          )
                        }
                      >
                        {THEME_PRESET_NUMS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </PanelOptionRow>
                    <PanelOptionRow label={t.settingsLang}>
                      <select
                        className="view-input"
                        value={s.lang}
                        onChange={(e) => s.set({ lang: e.target.value as Lang })}
                      >
                        <option value="zh">{t.settingsLangZh}</option>
                        <option value="en">{t.settingsLangEn}</option>
                      </select>
                    </PanelOptionRow>
                  </div>
                </Section>
                <Section title={t.settingsSectionText}>
                  <div className="panel-check-list">
                    <PanelOptionRow label={t.settingsFont}>
                      <div className="view-font-raw">
                        <select
                          className="view-input"
                          value={fontSelectValue}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v !== FONT_CUSTOM_VALUE) s.set({ fontFamily: v });
                          }}
                        >
                          {FONT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {fontOptionLabel(o, t)}
                            </option>
                          ))}
                          <option value={FONT_CUSTOM_VALUE}>{t.settingsFontCustom}</option>
                        </select>
                        {fontSelectValue === FONT_CUSTOM_VALUE && (
                          <input
                            type="text"
                            className="view-input view-font-input"
                            value={s.fontFamily}
                            onChange={(e) => s.set({ fontFamily: e.target.value })}
                            placeholder={t.settingsFontCustom}
                          />
                        )}
                      </div>
                    </PanelOptionRow>
                    <PanelOptionRow label={t.settingsFontSize}>
                      <NumberInput
                        value={s.fontSize}
                        min={8}
                        max={24}
                        defaultVal={12}
                        onChange={(n) => s.set({ fontSize: n })}
                      />
                    </PanelOptionRow>
                  </div>
                  <div className="panel-check-list">
                    <PanelCheckList items={TEXT_STYLE_CHECK_ITEMS} t={t} set={s.set} />
                  </div>
                </Section>
                <Section title={t.settingsSectionExport}>
                  <div>
                    <Row label={t.settingsExportFormat}>
                      <select
                        className="view-input"
                        value={s.exportFormat}
                        onChange={(e) =>
                          s.set({
                            exportFormat: e.target.value as 'svg' | 'png' | 'jpg' | 'webp' | 'pdf',
                          })
                        }
                      >
                        <option value="svg">{t.settingsExportFormatSvg}</option>
                        <option value="png">{t.settingsExportFormatPng}</option>
                        <option value="jpg">{t.settingsExportFormatJpg}</option>
                        <option value="webp">{t.settingsExportFormatWebp}</option>
                        <option value="pdf">{t.settingsExportFormatPdf}</option>
                      </select>
                    </Row>
                    {(s.exportFormat === 'png' || s.exportFormat === 'jpg') && (
                      <NumRow
                        label={t.settingsExportImageDpi}
                        value={s.exportImageDpi}
                        min={100}
                        max={600}
                        step={50}
                        defaultVal={300}
                        onChange={(n) => s.set({ exportImageDpi: n })}
                      />
                    )}
                    {(s.exportFormat === 'jpg' || s.exportFormat === 'webp') && (
                      <NumRow
                        label={t.settingsExportImageQuality}
                        value={s.exportImageQuality}
                        min={10}
                        max={100}
                        step={5}
                        defaultVal={95}
                        onChange={(n) => s.set({ exportImageQuality: n })}
                      />
                    )}
                    <Row label={t.settingsExportBackgroundColor}>
                      <select
                        className="view-input"
                        value={s.exportBackgroundColor}
                        onChange={(e) =>
                          s.set({
                            exportBackgroundColor: e.target.value as 'white' | 'none' | 'custom',
                          })
                        }
                      >
                        <option value="white">{t.settingsExportBackgroundColorWhite}</option>
                        <option value="none">{t.settingsExportBackgroundColorNone}</option>
                        <option value="custom">{t.settingsExportBackgroundColorCustom}</option>
                      </select>
                    </Row>
                    {s.exportBackgroundColor === 'custom' && (
                      <ColorItem
                        id="export-bg-color"
                        label={t.settingsExportBackgroundColorValue}
                        value={s.exportBackgroundColorValue}
                        onChange={(v) => s.set({ exportBackgroundColorValue: v })}
                      />
                    )}
                    <NumPairRow
                      label={`${t.settingsExportWidth} × ${t.settingsExportHeight}`}
                      valueA={s.exportWidth}
                      valueB={s.exportHeight}
                      minA={0}
                      maxA={4000}
                      stepA={50}
                      defaultA={0}
                      minB={0}
                      maxB={4000}
                      stepB={50}
                      defaultB={0}
                      onChangeA={(n) => s.set({ exportWidth: n })}
                      onChangeB={(n) => s.set({ exportHeight: n })}
                    />
                    <NumRow
                      label={t.settingsExportPadding}
                      value={s.exportPadding}
                      min={0}
                      max={200}
                      step={5}
                      defaultVal={0}
                      onChange={(n) => s.set({ exportPadding: n })}
                    />
                    <NumRow
                      label={t.settingsChartExportScale}
                      value={s.chartExportScale}
                      min={1}
                      max={4}
                      defaultVal={2}
                      onChange={(n) => s.set({ chartExportScale: n })}
                    />
                  </div>
                </Section>
              </div>
            )}

            {tab === 'layout' && (
              <div className="view-scroll panel-content">
                <Section title={t.settingsSectionLayout}>
                  <Row label={t.settingsLayout}>
                    <select
                      className="view-input"
                      value={s.rankDir}
                      onChange={(e) => s.set({ rankDir: e.target.value as 'LR' | 'TB' })}
                    >
                      <option value="LR">{t.settingsLayoutLR}</option>
                      <option value="TB">{t.settingsLayoutTB}</option>
                    </select>
                  </Row>
                  <NumPairRow
                    label={t.settingsNodeSize}
                    valueA={s.nodeWidth}
                    valueB={s.nodeHeight}
                    minA={40}
                    maxA={300}
                    defaultA={100}
                    minB={24}
                    maxB={120}
                    defaultB={44}
                    onChangeA={(n) => s.set({ nodeWidth: n })}
                    onChangeB={(n) => s.set({ nodeHeight: n })}
                  />
                  <NumRow
                    label={t.settingsNodeGap}
                    value={s.nodeGap}
                    min={10}
                    max={200}
                    defaultVal={60}
                    onChange={(n) => s.set({ nodeGap: n })}
                  />
                  <NumRow
                    label={t.settingsRankGap}
                    value={s.rankGap}
                    min={20}
                    max={200}
                    defaultVal={60}
                    onChange={(n) => s.set({ rankGap: n })}
                  />
                  <div className="panel-check-list">
                    <PanelCheck
                      label={t.settingsEdgeLabelShape}
                      checked={s.edgeLabelShowShape}
                      onChange={(v) => s.set({ edgeLabelShowShape: v })}
                    />
                    <PanelCheck
                      label={t.settingsNodeLabelAttrs}
                      checked={s.nodeLabelShowAttrs}
                      onChange={(v) => s.set({ nodeLabelShowAttrs: v })}
                    />
                    <PanelCheck
                      label={t.settingsShowWeightNodes}
                      checked={s.showWeightNodes}
                      onChange={(v) => s.set({ showWeightNodes: v })}
                    />
                    <PanelCheck
                      label={t.settingsShowIONodes}
                      checked={s.showIONodes}
                      onChange={(v) => s.set({ showIONodes: v })}
                    />
                  </div>
                </Section>
                <Section title={t.settingsSectionChartSize}>
                  <NumPairRow
                    label={t.settingsChartSize}
                    valueA={s.chartWidth}
                    valueB={s.chartHeight}
                    minA={320}
                    maxA={1600}
                    stepA={50}
                    defaultA={720}
                    minB={240}
                    maxB={1200}
                    stepB={50}
                    defaultB={480}
                    onChangeA={(n) => s.set({ chartWidth: n })}
                    onChangeB={(n) => s.set({ chartHeight: n })}
                  />
                  <NumRow
                    label={t.settingsChartPadding}
                    value={s.chartPadding}
                    min={16}
                    max={80}
                    defaultVal={40}
                    onChange={(n) => s.set({ chartPadding: n })}
                  />
                  <NumRow
                    label={t.settingsChartLabelFontSize}
                    value={s.chartLabelFontSize}
                    min={0}
                    max={20}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartLabelFontSize: n })}
                  />
                </Section>
                <Section title={t.settingsSectionChartTitles}>
                  <Row label={t.settingsChartTitle}>
                    <input
                      type="text"
                      className="view-input"
                      value={s.chartTitle}
                      onChange={(e) => s.set({ chartTitle: e.target.value })}
                      placeholder="—"
                    />
                  </Row>
                  <Row label={t.settingsChartXTitle}>
                    <input
                      type="text"
                      className="view-input"
                      value={s.chartXTitle}
                      onChange={(e) => s.set({ chartXTitle: e.target.value })}
                      placeholder="—"
                    />
                  </Row>
                  <Row label={t.settingsChartYTitle}>
                    <input
                      type="text"
                      className="view-input"
                      value={s.chartYTitle}
                      onChange={(e) => s.set({ chartYTitle: e.target.value })}
                      placeholder="—"
                    />
                  </Row>
                  <NumRow
                    label={t.settingsChartTitleFontSize}
                    value={s.chartTitleFontSize}
                    min={0}
                    max={24}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartTitleFontSize: n })}
                  />
                  <NumRow
                    label={t.settingsChartAxisTitleFontSize}
                    value={s.chartAxisTitleFontSize}
                    min={0}
                    max={20}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartAxisTitleFontSize: n })}
                  />
                </Section>
                <Section title={t.settingsSectionChartDataLabels}>
                  <div style={{ padding: '8px 0', color: 'var(--text2)', fontSize: '12px' }}></div>
                  <NumRow
                    label={t.settingsChartLabelMaxLength}
                    value={s.chartLabelMaxLength}
                    min={0}
                    max={32}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartLabelMaxLength: n })}
                  />
                </Section>
                <Section title={t.settingsSectionChartAxis}>
                  <NumRow
                    label={t.settingsChartAxisPaddingLeft}
                    value={s.chartAxisPaddingLeft}
                    min={0}
                    max={50}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartAxisPaddingLeft: n })}
                  />
                  <NumRow
                    label={t.settingsChartAxisPaddingRight}
                    value={s.chartAxisPaddingRight}
                    min={0}
                    max={50}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartAxisPaddingRight: n })}
                  />
                  <NumRow
                    label={t.settingsChartAxisPaddingTop}
                    value={s.chartAxisPaddingTop}
                    min={0}
                    max={50}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartAxisPaddingTop: n })}
                  />
                  <NumRow
                    label={t.settingsChartAxisPaddingBottom}
                    value={s.chartAxisPaddingBottom}
                    min={0}
                    max={50}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartAxisPaddingBottom: n })}
                  />
                  <NumRow
                    label={t.settingsChartAxisLabelDecimals}
                    value={s.chartAxisLabelDecimals}
                    min={0}
                    max={6}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartAxisLabelDecimals: n })}
                  />
                  <div className="panel-check-list">
                    <PanelCheck
                      label={t.settingsChartSwapXY}
                      checked={s.chartSwapXY}
                      onChange={(v) => s.set({ chartSwapXY: v })}
                    />
                    <PanelCheck
                      label={t.settingsChartShowAxisLine}
                      checked={s.chartShowAxisLine}
                      onChange={(v) => s.set({ chartShowAxisLine: v })}
                    />
                    <PanelCheck
                      label={t.settingsChartShowAxisLabels}
                      checked={s.chartShowAxisLabels}
                      onChange={(v) => s.set({ chartShowAxisLabels: v })}
                    />
                    <PanelCheck
                      label={t.settingsChartShowAxisTicks}
                      checked={s.chartShowAxisTicks}
                      onChange={(v) => s.set({ chartShowAxisTicks: v })}
                    />
                    <PanelCheck
                      label={t.settingsChartAxisLabelBold}
                      checked={s.chartAxisLabelBold}
                      onChange={(v) => s.set({ chartAxisLabelBold: v })}
                    />
                    <PanelCheck
                      label={t.settingsChartAxisLabelItalic}
                      checked={s.chartAxisLabelItalic}
                      onChange={(v) => s.set({ chartAxisLabelItalic: v })}
                    />
                  </div>
                  <NumRow
                    label={t.settingsChartAxisStrokeWidth}
                    value={s.chartAxisStrokeWidth}
                    min={0.5}
                    max={3}
                    step={0.5}
                    defaultVal={1}
                    onChange={(n) => s.set({ chartAxisStrokeWidth: n })}
                  />
                  <Row label={t.settingsChartAxisBoxStyle}>
                    <select
                      className="view-input"
                      value={s.chartAxisBoxStyle}
                      onChange={(e) =>
                        s.set({ chartAxisBoxStyle: e.target.value as 'full' | 'half' | 'none' })
                      }
                    >
                      <option value="full">{t.settingsChartAxisBoxStyleFull}</option>
                      <option value="half">{t.settingsChartAxisBoxStyleHalf}</option>
                      <option value="none">{t.settingsChartAxisBoxStyleNone}</option>
                    </select>
                  </Row>
                  <Row label={t.settingsChartAxisStrokeStyle}>
                    <select
                      className="view-input"
                      value={s.chartAxisStrokeStyle}
                      onChange={(e) =>
                        s.set({
                          chartAxisStrokeStyle: e.target.value as
                            | 'solid'
                            | 'dashed'
                            | 'dotted'
                            | 'dashdot',
                        })
                      }
                    >
                      <option value="solid">{t.settingsChartAxisStrokeStyleSolid}</option>
                      <option value="dashed">{t.settingsChartAxisStrokeStyleDashed}</option>
                      <option value="dotted">{t.settingsChartAxisStrokeStyleDotted}</option>
                      <option value="dashdot">{t.settingsChartAxisStrokeStyleDashdot}</option>
                    </select>
                  </Row>
                  <Row label={t.settingsChartAxisTickStyle}>
                    <select
                      className="view-input"
                      value={s.chartAxisTickStyle}
                      onChange={(e) =>
                        s.set({
                          chartAxisTickStyle: e.target.value as
                            | 'inside-full'
                            | 'inside-half'
                            | 'outside-full'
                            | 'outside-half',
                        })
                      }
                    >
                      <option value="inside-full">{t.settingsChartAxisTickStyleInsideFull}</option>
                      <option value="inside-half">{t.settingsChartAxisTickStyleInsideHalf}</option>
                      <option value="outside-full">
                        {t.settingsChartAxisTickStyleOutsideFull}
                      </option>
                      <option value="outside-half">
                        {t.settingsChartAxisTickStyleOutsideHalf}
                      </option>
                    </select>
                  </Row>
                  <NumRow
                    label={t.settingsChartAxisTickLength}
                    value={s.chartAxisTickLength}
                    min={0}
                    max={12}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartAxisTickLength: n })}
                  />
                  <NumRow
                    label={t.settingsChartAxisTickCount}
                    value={s.chartAxisTickCount}
                    min={0}
                    max={20}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartAxisTickCount: n })}
                  />
                </Section>
                <Section title={t.settingsSectionChartGrid}>
                  <PanelCheck
                    label={t.settingsChartShowGrid}
                    checked={s.chartShowGrid}
                    onChange={(v) => s.set({ chartShowGrid: v })}
                  />
                  <NumRow
                    label={t.settingsChartGridStrokeWidth}
                    value={s.chartGridStrokeWidth}
                    min={0.25}
                    max={2}
                    step={0.25}
                    defaultVal={0.5}
                    onChange={(n) => s.set({ chartGridStrokeWidth: n })}
                  />
                  <Row label={t.settingsChartGridStrokeStyle}>
                    <select
                      className="view-input"
                      value={s.chartGridStrokeStyle}
                      onChange={(e) =>
                        s.set({
                          chartGridStrokeStyle: e.target.value as
                            | 'solid'
                            | 'dashed'
                            | 'dotted'
                            | 'dashdot',
                        })
                      }
                    >
                      <option value="solid">{t.settingsChartAxisStrokeStyleSolid}</option>
                      <option value="dashed">{t.settingsChartAxisStrokeStyleDashed}</option>
                      <option value="dotted">{t.settingsChartAxisStrokeStyleDotted}</option>
                      <option value="dashdot">{t.settingsChartAxisStrokeStyleDashdot}</option>
                    </select>
                  </Row>
                  <NumRow
                    label={t.settingsChartGridOpacity}
                    value={s.chartGridOpacity}
                    min={0.1}
                    max={1}
                    step={0.1}
                    defaultVal={0.3}
                    onChange={(n) => s.set({ chartGridOpacity: n })}
                  />
                  <NumRow
                    label={t.settingsChartGridLineCount}
                    value={s.chartGridLineCount}
                    min={2}
                    max={12}
                    defaultVal={4}
                    onChange={(n) => s.set({ chartGridLineCount: n })}
                  />
                </Section>
                <Section title={t.settingsSectionChartLegend}>
                  <div className="panel-check-list">
                    <PanelCheck
                      label={t.settingsChartShowLegend}
                      checked={s.chartShowLegend}
                      onChange={(v) => s.set({ chartShowLegend: v })}
                    />
                    <PanelCheck
                      label={t.settingsChartLegendInside}
                      checked={s.chartLegendInside}
                      onChange={(v) => s.set({ chartLegendInside: v })}
                    />
                    <PanelCheck
                      label={t.settingsChartLegendBold}
                      checked={s.chartLegendBold}
                      onChange={(v) => s.set({ chartLegendBold: v })}
                    />
                    <PanelCheck
                      label={t.settingsChartLegendItalic}
                      checked={s.chartLegendItalic}
                      onChange={(v) => s.set({ chartLegendItalic: v })}
                    />
                  </div>
                  <NumRow
                    label={t.settingsChartLegendMaxLength}
                    value={s.chartLegendMaxLength}
                    min={0}
                    max={64}
                    defaultVal={12}
                    onChange={(n) => s.set({ chartLegendMaxLength: n })}
                  />
                  <NumRow
                    label={t.settingsChartLegendMaxColumns}
                    value={s.chartLegendMaxColumns}
                    min={0}
                    max={20}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartLegendMaxColumns: n })}
                  />
                  <Row label={t.settingsChartLegendPosition}>
                    <select
                      className="view-input"
                      value={s.chartLegendPosition}
                      onChange={(e) =>
                        s.set({
                          chartLegendPosition: e.target.value as
                            | 'top'
                            | 'bottom'
                            | 'left'
                            | 'right'
                            | 'top-left'
                            | 'top-right'
                            | 'bottom-left'
                            | 'bottom-right',
                        })
                      }
                    >
                      <option value="top">{t.settingsChartLegendTop}</option>
                      <option value="bottom">{t.settingsChartLegendBottom}</option>
                      <option value="left">{t.settingsChartLegendLeft}</option>
                      <option value="right">{t.settingsChartLegendRight}</option>
                      <option value="top-left">{t.settingsChartLegendTopLeft}</option>
                      <option value="top-right">{t.settingsChartLegendTopRight}</option>
                      <option value="bottom-left">{t.settingsChartLegendBottomLeft}</option>
                      <option value="bottom-right">{t.settingsChartLegendBottomRight}</option>
                    </select>
                  </Row>
                  <NumRow
                    label={t.settingsChartLegendWidth}
                    value={s.chartLegendWidth}
                    min={0}
                    max={400}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartLegendWidth: n })}
                  />
                  <NumRow
                    label={t.settingsChartLegendHeight}
                    value={s.chartLegendHeight}
                    min={0}
                    max={300}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartLegendHeight: n })}
                  />
                  <NumRow
                    label={t.settingsChartLegendOffsetX}
                    value={s.chartLegendOffsetX}
                    min={-200}
                    max={200}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartLegendOffsetX: n })}
                  />
                  <NumRow
                    label={t.settingsChartLegendOffsetY}
                    value={s.chartLegendOffsetY}
                    min={-200}
                    max={200}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartLegendOffsetY: n })}
                  />
                  <NumRow
                    label={t.settingsChartLegendFontSize}
                    value={s.chartLegendFontSize}
                    min={0}
                    max={20}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartLegendFontSize: n })}
                  />
                  <NumRow
                    label={t.settingsChartLegendItemSpacing}
                    value={s.chartLegendItemSpacing}
                    min={2}
                    max={24}
                    defaultVal={8}
                    onChange={(n) => s.set({ chartLegendItemSpacing: n })}
                  />
                  <NumRow
                    label={t.settingsChartLegendSymbolSize}
                    value={s.chartLegendSymbolSize}
                    min={6}
                    max={24}
                    defaultVal={10}
                    onChange={(n) => s.set({ chartLegendSymbolSize: n })}
                  />
                </Section>
                <Section title={t.settingsSectionChartBar}>
                  <NumRow
                    label={t.settingsChartBarGapInner}
                    value={s.chartBarGapInner}
                    min={0}
                    max={24}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartBarGapInner: n })}
                  />
                  <NumRow
                    label={t.settingsChartBarGapOuter}
                    value={s.chartBarGapOuter}
                    min={0}
                    max={48}
                    defaultVal={8}
                    onChange={(n) => s.set({ chartBarGapOuter: n })}
                  />
                  <NumRow
                    label={t.settingsChartBarCornerRadius}
                    value={s.chartBarCornerRadius}
                    min={0}
                    max={20}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartBarCornerRadius: n })}
                  />
                  <NumRow
                    label={t.settingsChartBarMinHeight}
                    value={s.chartBarMinHeight}
                    min={0}
                    max={80}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartBarMinHeight: n })}
                  />
                  <NumRow
                    label={t.settingsChartBarMinWidth}
                    value={s.chartBarMinWidth}
                    min={0}
                    max={60}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartBarMinWidth: n })}
                  />
                </Section>
                <Section title={t.settingsSectionChartPie}>
                  <NumRow
                    label={t.settingsChartPieInnerRadius}
                    value={s.chartPieInnerRadius}
                    min={0}
                    max={80}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartPieInnerRadius: n })}
                  />
                  <Row label={t.settingsChartPieLabelPosition}>
                    <select
                      className="view-input"
                      value={s.chartPieLabelPosition}
                      onChange={(e) =>
                        s.set({
                          chartPieLabelPosition: e.target.value as 'outside' | 'inside' | 'none',
                        })
                      }
                    >
                      <option value="outside">{t.settingsChartPieLabelOutside}</option>
                      <option value="inside">{t.settingsChartPieLabelInside}</option>
                      <option value="none">{t.settingsChartPieLabelNone}</option>
                    </select>
                  </Row>
                  <NumRow
                    label={t.settingsChartPieStartAngle}
                    value={s.chartPieStartAngle}
                    min={-360}
                    max={360}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartPieStartAngle: n })}
                  />
                  <NumRow
                    label={t.settingsChartPieLabelMaxLength}
                    value={s.chartPieLabelMaxLength}
                    min={0}
                    max={50}
                    defaultVal={0}
                    onChange={(n) => s.set({ chartPieLabelMaxLength: n })}
                  />
                </Section>
              </div>
            )}

            {tab === 'lines' && (
              <div className="view-scroll panel-content">
                <Section title={t.settingsSectionLines}>
                  <NumRow
                    label={t.settingsEdgeWidth}
                    value={s.edgeWidth}
                    min={0.5}
                    max={4}
                    step={0.5}
                    defaultVal={1}
                    onChange={(n) => s.set({ edgeWidth: n })}
                  />
                  <NumRow
                    label={t.settingsEdgeCurvature}
                    value={s.edgeCurvature}
                    min={0}
                    max={1}
                    step={0.05}
                    defaultVal={0}
                    onChange={(n) => s.set({ edgeCurvature: n })}
                  />
                  <NumRow
                    label={t.settingsNodeCornerRadius}
                    value={s.nodeCornerRadius}
                    min={0}
                    max={20}
                    defaultVal={0}
                    onChange={(n) => s.set({ nodeCornerRadius: n })}
                  />
                  <NumRow
                    label={t.settingsNodeStrokeWidth}
                    value={s.nodeStrokeWidth}
                    min={0.5}
                    max={3}
                    step={0.5}
                    defaultVal={1}
                    onChange={(n) => s.set({ nodeStrokeWidth: n })}
                  />
                  <NumRow
                    label={t.settingsNodeShadow}
                    value={s.nodeShadowBlur}
                    min={0}
                    max={8}
                    defaultVal={0}
                    onChange={(n) => s.set({ nodeShadowBlur: n })}
                  />
                </Section>
              </div>
            )}

            {tab === 'colors' && (
              <div className="view-scroll panel-content">
                <Section title={t.settingsColorUi}>
                  {UI_COLORS.map((k) => (
                    <ColorItem
                      key={k}
                      id={`c-${k}`}
                      label={t[COLOR_LABELS[k]]}
                      value={s[k]}
                      onChange={(v) => s.set({ [k]: v })}
                    />
                  ))}
                </Section>
                <Section title={t.settingsColorGraph}>
                  {GRAPH_COLORS.map((k) => (
                    <ColorItem
                      key={k}
                      id={`c-${k}`}
                      label={t[COLOR_LABELS[k]]}
                      value={s[k]}
                      onChange={(v) => s.set({ [k]: v })}
                    />
                  ))}
                </Section>
                <Section title={t.settingsColorChart}>
                  <ColorItem
                    id="chart-grid-color"
                    label={t.settingsChartGridColor}
                    value={s.chartGridColor}
                    onChange={(v) => s.set({ chartGridColor: v })}
                  />
                  <ColorItem
                    id="chart-axis-color"
                    label={t.settingsChartAxisColor}
                    value={s.chartAxisColor}
                    onChange={(v) => s.set({ chartAxisColor: v })}
                  />
                  <ColorItem
                    id="chart-tick-color"
                    label={t.settingsChartTickColor}
                    value={s.chartTickColor}
                    onChange={(v) => s.set({ chartTickColor: v })}
                  />
                </Section>
                <Section title={t.settingsColorTensorRole}>
                  {TENSOR_ROLE_KEYS.map((labelKey, i) => (
                    <ColorItem
                      key={labelKey}
                      id={`tensor-${i}`}
                      label={t[labelKey]}
                      value={tensorRole[i] ?? '#dbeafe'}
                      onChange={(v) =>
                        s.set({
                          tensorRoleColors: [
                            ...(s.tensorRoleColors ?? tensorRole).slice(0, i),
                            v,
                            ...(s.tensorRoleColors ?? tensorRole).slice(i + 1),
                          ],
                        })
                      }
                    />
                  ))}
                </Section>
              </div>
            )}
          </div>
        </div>
        <div
          className="view-dropdown-splitter"
          role="separator"
          aria-orientation="vertical"
          onMouseDown={(e) => {
            e.preventDefault();
            setResizing(true);
          }}
        />
      </div>
      <div
        className="view-dropdown-splitter view-dropdown-splitter-h"
        role="separator"
        aria-orientation="horizontal"
        onMouseDown={(e) => {
          e.preventDefault();
          setResizingHeight(true);
        }}
      />
    </div>
  );

  return createPortal(dropdown, document.body);
}
