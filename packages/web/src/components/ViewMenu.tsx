import { useRef, useEffect, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../stores';
import {
  themeToMode,
  themeToPresetNum,
  modeAndPresetToTheme,
  THEME_PRESET_NUMS,
  FILL_STYLES,
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

/** 字体项：name 直接显示，nameKey 用 locale；value 为 font stack */
type FontOption = { name?: string; nameKey?: keyof ReturnType<typeof getLocale>; value: string };

/* 带空格的字体名用单引号，避免写入 HTML style 时与外层双引号冲突；value 统一用双引号包裹便于书写 */
const FONT_OPTIONS_EN: FontOption[] = [
  {
    nameKey: 'settingsFontSystem',
    value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Ubuntu, sans-serif",
  },
  { nameKey: 'settingsFontSans', value: "system-ui, 'Segoe UI', Roboto, sans-serif" },
  { nameKey: 'settingsFontMono', value: "ui-monospace, 'Cascadia Code', Consolas, monospace" },
  { name: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { name: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { name: 'Segoe UI', value: "'Segoe UI', Tahoma, sans-serif" },
  { name: 'Consolas', value: "Consolas, 'Courier New', monospace" },
  { name: 'Courier New', value: "'Courier New', Courier, monospace" },
  { name: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { name: 'Calibri', value: "Calibri, 'Segoe UI', sans-serif" },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
];

/* 中文字体：Mac/iOS 用 -apple-system、PingFang SC、ST*、* SC；Windows 用 SimSun/KaiTi 等；中文名作回退 */
const FONT_OPTIONS_ZH: FontOption[] = [
  {
    name: '苹方',
    value:
      "-apple-system, 'PingFang SC', 'PingFangSC-Regular', 'PingFangSC-Medium', 'Microsoft YaHei', sans-serif",
  },
  { name: '微软雅黑', value: "'Microsoft YaHei', -apple-system, 'PingFang SC', sans-serif" },
  { name: '思源黑体', value: "'Source Han Sans SC', 'PingFang SC', -apple-system, sans-serif" },
  { name: 'Noto Sans SC', value: "'Noto Sans SC', 'PingFang SC', -apple-system, sans-serif" },
  { name: '宋体', value: "'STSong', 'Songti SC', SimSun, '宋体', serif" },
  { name: '黑体', value: "'STHeiti', 'Heiti SC', 'PingFang SC', SimHei, '黑体', sans-serif" },
  /* 楷体：Safari/macOS 认 Kaiti SC，故 Mac 名放前；Windows 用 KaiTi */
  { name: '楷体', value: "'Kaiti SC', 'STKaiti', KaiTi, '楷体', serif" },
  {
    name: '仿宋',
    value: "'STFangsong', 'Fangsong SC', FangSong, 'FangSong_GB2312', '仿宋', serif",
  },
  {
    name: '等线',
    value:
      "'DengXian', 'Dengxian', '等线', -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  { name: '华文宋体', value: "'STSong', '华文宋体', 'Songti SC', SimSun, '宋体', serif" },
  { name: '华文楷体', value: "'STKaiti', '华文楷体', 'Kaiti SC', KaiTi, '楷体', serif" },
  {
    name: '华文黑体',
    value: "'STHeiti', '华文黑体', 'Heiti SC', 'PingFang SC', SimHei, '黑体', sans-serif",
  },
  {
    name: '华文仿宋',
    value: "'STFangsong', '华文仿宋', 'Fangsong SC', FangSong, 'FangSong_GB2312', '仿宋', serif",
  },
  {
    name: '冬青黑体',
    value:
      "'Hiragino Sans GB', '冬青黑体', 'Hiragino Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
];

function fontOptionLabel(o: FontOption, t: ReturnType<typeof getLocale>): string {
  return o.name ?? (o.nameKey ? t[o.nameKey] : o.value);
}

/** 与 store 一致：双引号改单引号，使持久化 value 能与当前选项匹配 */
function normalizeFontQuotesForMatch(s: string): string {
  return s.replace(/"/g, "'");
}

const GENERIC_FAMILIES_ZH = ['serif', 'sans-serif', 'monospace'];

/** 剥掉末尾泛用族，只保留具体字体名（用于按「字体集合」匹配，顺序无关） */
function fontStackRest(stack: string): string {
  const t = stack.trim();
  if (!t) return '';
  const parts = t.split(',').map((p) => p.trim());
  const last = parts[parts.length - 1];
  if (last && GENERIC_FAMILIES_ZH.includes(last)) return parts.slice(0, -1).join(', ');
  return t;
}

/** rest 解析为字体名集合（用于子集匹配） */
function fontStackNameSet(rest: string): Set<string> {
  return new Set(
    rest
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
  );
}

/** 中文字体用索引作为 select value；兼容旧持久化：完整 value 匹配，或存储的字体集合是某选项的子集/一致时匹配 */
function getZhFontSelectIndex(stored: string, options: FontOption[]): number {
  if (!stored) return -1;
  const normalized = normalizeFontQuotesForMatch(stored);
  let i = options.findIndex((o) => o.value === normalized || o.value === stored);
  if (i >= 0) return i;
  const storedRest = fontStackRest(normalized);
  if (!storedRest) return -1;
  const storedSet = fontStackNameSet(storedRest);
  if (storedSet.size === 0) return -1;
  i = options.findIndex((o) => {
    const oRest = fontStackRest(normalizeFontQuotesForMatch(o.value));
    const oSet = fontStackNameSet(oRest);
    if (oSet.size === 0) return false;
    if (storedSet.size === oSet.size && [...storedSet].every((f) => oSet.has(f))) return true;
    if (storedSet.size <= oSet.size && [...storedSet].every((f) => oSet.has(f))) return true;
    if (oSet.size <= storedSet.size && [...oSet].every((f) => storedSet.has(f))) return true;
    return false;
  });
  return i >= 0 ? i : -1;
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
  const [resizingCorner, setResizingCorner] = useState(false);
  const s = useSettingsStore();
  const t = getLocale(s.lang);

  const VIEW_MENU_HEIGHT_MIN = 200;
  const VIEW_MENU_HEIGHT_MAX = () => Math.min(Math.round(window.innerHeight * 0.8), 560);

  const [position, setPosition] = useState<{ top: number; left?: number; right?: number }>({
    top: 0,
    left: 0,
  });
  /** 窗口/旋转变化时重新定位，避免浮窗位置错位 */
  const [resizeTick, setResizeTick] = useState(0);
  useEffect(() => {
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const isRight = rect.left > window.innerWidth / 2;
    setPosition({
      top: rect.bottom + 4,
      ...(isRight ? { right: window.innerWidth - rect.right } : { left: rect.left }),
    });
  }, [open, anchorRef, resizeTick]);

  /** 旋转/resize 后限制设置浮窗宽高，避免压住按钮 */
  useEffect(() => {
    if (!open) return;
    const maxW = Math.min(480, window.innerWidth * 0.9);
    const maxH = VIEW_MENU_HEIGHT_MAX();
    const state = useSettingsStore.getState();
    const curW = state.viewMenuWidth ?? 280;
    const curH = state.viewMenuHeight ?? 0;
    const updates: { viewMenuWidth?: number; viewMenuHeight?: number } = {};
    if (curW > maxW) updates.viewMenuWidth = maxW;
    if (curH > 0 && curH > maxH) updates.viewMenuHeight = maxH;
    if (Object.keys(updates).length > 0) state.set(updates);
  }, [open, resizeTick]);

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
    if (!resizingCorner) return;
    const VIEW_MENU_MIN = 220;
    const VIEW_MENU_MAX = Math.min(480, window.innerWidth * 0.9);
    const onMove = (pos: { clientX: number; clientY: number }) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      const w = Math.max(VIEW_MENU_MIN, Math.min(VIEW_MENU_MAX, pos.clientX - rect.left));
      const h = Math.max(
        VIEW_MENU_HEIGHT_MIN,
        Math.min(VIEW_MENU_HEIGHT_MAX(), pos.clientY - rect.top)
      );
      s.set({ viewMenuWidth: w, viewMenuHeight: h });
    };
    const onMouseMove = (e: MouseEvent) => onMove(e);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        e.preventDefault();
        onMove(e.touches[0]);
      }
    };
    const onUp = () => {
      setResizingCorner(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove, { capture: true });
      document.removeEventListener('touchend', onTouchEnd, { capture: true });
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    const onMouseUp = onUp;
    const onTouchEnd = onUp;
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', onTouchEnd, { capture: true });
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove, { capture: true });
      document.removeEventListener('touchend', onTouchEnd, { capture: true });
    };
  }, [resizingCorner, s]);

  if (!open) return null;

  const tensorRole = s.tensorRoleColors ?? ['#dbeafe', '#fed7aa', '#e9d5ff', '#bbf7d0'];

  const availHeight =
    typeof window !== 'undefined' ? Math.max(200, window.innerHeight - position.top - 16) : 560;
  const maxH = Math.min(availHeight, VIEW_MENU_HEIGHT_MAX());
  const styleHeight = s.viewMenuHeight > 0 ? Math.min(s.viewMenuHeight, maxH) : undefined;

  const dropdown = (
    <div
      ref={wrapRef}
      className="view-menu-wrap view-dropdown-wrap view-dropdown-portal float-dropdown panel-glass-outer"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left ?? 'auto',
        right: position.right !== undefined ? position.right : 'auto',
        width: s.viewMenuWidth,
        minWidth: 220,
        maxWidth: Math.min(480, typeof window !== 'undefined' ? window.innerWidth * 0.9 : 480),
        maxHeight: maxH,
        height: styleHeight ?? maxH,
      }}
    >
      <div
        className="float-panel-resize-corner float-panel-resize-corner-br"
        role="separator"
        aria-label="调整大小"
        style={{ touchAction: 'none' }}
        onMouseDown={(e) => {
          e.preventDefault();
          setResizingCorner(true);
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          setResizingCorner(true);
        }}
      />
      <div className="panel-glass">
        <div className="view-dropdown-wrap-inner">
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
                            modeAndPresetToTheme(
                              isDark ? 'dark' : 'light',
                              themeToPresetNum(s.theme)
                            )
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
                      <PanelOptionRow label={t.settingsFontEn}>
                        <select
                          className="view-input"
                          value={s.fontFamilyEn}
                          onChange={(e) => s.set({ fontFamilyEn: e.target.value })}
                        >
                          {FONT_OPTIONS_EN.map((o) => (
                            <option key={o.value} value={o.value}>
                              {fontOptionLabel(o, t)}
                            </option>
                          ))}
                        </select>
                      </PanelOptionRow>
                      <PanelOptionRow label={t.settingsFontZh}>
                        <select
                          className="view-input"
                          value={(() => {
                            const idx = getZhFontSelectIndex(s.fontFamilyZh, FONT_OPTIONS_ZH);
                            return idx < 0 ? '' : String(idx);
                          })()}
                          onChange={(e) => {
                            const v = e.target.value;
                            const fontZh =
                              v === '' ? '' : (FONT_OPTIONS_ZH[Number(v)]?.value ?? '');
                            s.set({ fontFamilyZh: fontZh });
                          }}
                        >
                          <option value="">{t.settingsFontZhNone}</option>
                          {FONT_OPTIONS_ZH.map((o, i) => (
                            <option key={i} value={i}>
                              {fontOptionLabel(o, t)}
                            </option>
                          ))}
                        </select>
                      </PanelOptionRow>
                      <PanelOptionRow label={t.settingsFontCustom}>
                        <input
                          type="text"
                          className="view-input view-font-input"
                          value={s.fontFamilyCustom}
                          onChange={(e) => s.set({ fontFamilyCustom: e.target.value })}
                          placeholder={t.settingsFontCustom}
                        />
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
                              exportFormat: e.target.value as
                                | 'svg'
                                | 'png'
                                | 'jpg'
                                | 'webp'
                                | 'pdf',
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
                  <Section title={t.settingsSectionRestore}>
                    <div className="panel-restore-row">
                      <button
                        type="button"
                        className="view-input view-btn-secondary"
                        onClick={() => s.resetFontToDefault()}
                      >
                        {t.settingsRestoreFont}
                      </button>
                      <button
                        type="button"
                        className="view-input view-btn-secondary"
                        onClick={() => s.resetViewSettingsToDefault()}
                      >
                        {t.settingsRestoreView}
                      </button>
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
                    <Row label={t.settingsChartYTitlePosition}>
                      <select
                        className="view-input"
                        value={s.chartYTitlePosition}
                        onChange={(e) =>
                          s.set({ chartYTitlePosition: e.target.value as 'left' | 'right' })
                        }
                      >
                        <option value="left">{t.settingsChartYTitlePositionLeft}</option>
                        <option value="right">{t.settingsChartYTitlePositionRight}</option>
                      </select>
                    </Row>
                    <Row label={t.settingsChartXTitlePosition}>
                      <select
                        className="view-input"
                        value={s.chartXTitlePosition}
                        onChange={(e) =>
                          s.set({ chartXTitlePosition: e.target.value as 'top' | 'bottom' })
                        }
                      >
                        <option value="top">{t.settingsChartXTitlePositionTop}</option>
                        <option value="bottom">{t.settingsChartXTitlePositionBottom}</option>
                      </select>
                    </Row>
                    <div className="panel-check-list">
                      <PanelCheck
                        label={t.settingsChartTitleBold}
                        checked={s.chartTitleBold}
                        onChange={(v) => s.set({ chartTitleBold: v })}
                      />
                      <PanelCheck
                        label={t.settingsChartTitleItalic}
                        checked={s.chartTitleItalic}
                        onChange={(v) => s.set({ chartTitleItalic: v })}
                      />
                      <PanelCheck
                        label={t.settingsChartAxisTitleBold}
                        checked={s.chartAxisTitleBold}
                        onChange={(v) => s.set({ chartAxisTitleBold: v })}
                      />
                      <PanelCheck
                        label={t.settingsChartAxisTitleItalic}
                        checked={s.chartAxisTitleItalic}
                        onChange={(v) => s.set({ chartAxisTitleItalic: v })}
                      />
                    </div>
                  </Section>
                  <Section title={t.settingsSectionChartDataLabels}>
                    <div className="panel-check-list">
                      <PanelCheck
                        label={t.settingsChartShowDataLabels}
                        checked={s.chartShowDataLabels}
                        onChange={(v) => s.set({ chartShowDataLabels: v })}
                      />
                      <PanelCheck
                        label={t.settingsChartDataLabelBold}
                        checked={s.chartDataLabelBold}
                        onChange={(v) => s.set({ chartDataLabelBold: v })}
                      />
                      <PanelCheck
                        label={t.settingsChartDataLabelItalic}
                        checked={s.chartDataLabelItalic}
                        onChange={(v) => s.set({ chartDataLabelItalic: v })}
                      />
                    </div>
                    <NumRow
                      label={t.settingsChartDataLabelFontSize}
                      value={s.chartDataLabelFontSize}
                      min={0}
                      max={48}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartDataLabelFontSize: n })}
                    />
                    <NumRow
                      label={t.settingsChartDataLabelDecimals}
                      value={s.chartDataLabelDecimals}
                      min={0}
                      max={6}
                      defaultVal={2}
                      onChange={(n) => s.set({ chartDataLabelDecimals: n })}
                    />
                    <Row label={t.settingsChartDataLabelPosition}>
                      <select
                        className="view-input"
                        value={s.chartDataLabelPosition}
                        onChange={(e) =>
                          s.set({
                            chartDataLabelPosition: e.target.value as 'top' | 'bottom' | 'auto',
                          })
                        }
                      >
                        <option value="top">{t.settingsChartDataLabelPositionTop}</option>
                        <option value="bottom">{t.settingsChartDataLabelPositionBottom}</option>
                        <option value="auto">{t.settingsChartDataLabelPositionAuto}</option>
                      </select>
                    </Row>
                    <NumRow
                      label={t.settingsChartDataLabelOffsetX}
                      value={s.chartDataLabelOffsetX}
                      min={-100}
                      max={100}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartDataLabelOffsetX: n })}
                    />
                    <NumRow
                      label={t.settingsChartDataLabelOffsetY}
                      value={s.chartDataLabelOffsetY}
                      min={-100}
                      max={100}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartDataLabelOffsetY: n })}
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
                      label={t.settingsChartAxisLabelDecimalsX}
                      value={s.chartAxisLabelDecimalsX}
                      min={0}
                      max={6}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartAxisLabelDecimalsX: n })}
                    />
                    <NumRow
                      label={t.settingsChartAxisLabelDecimalsY}
                      value={s.chartAxisLabelDecimalsY}
                      min={0}
                      max={6}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartAxisLabelDecimalsY: n })}
                    />
                    <Row label={t.settingsChartAxisLabelFormatX}>
                      <select
                        className="view-input"
                        value={s.chartAxisLabelFormatX}
                        onChange={(e) =>
                          s.set({
                            chartAxisLabelFormatX: e.target.value as
                              | 'normal'
                              | 'scientific_e'
                              | 'scientific_10',
                          })
                        }
                      >
                        <option value="normal">{t.settingsChartAxisLabelFormatNormal}</option>
                        <option value="scientific_e">
                          {t.settingsChartAxisLabelFormatScientificE}
                        </option>
                        <option value="scientific_10">
                          {t.settingsChartAxisLabelFormatScientific10}
                        </option>
                      </select>
                    </Row>
                    <Row label={t.settingsChartAxisLabelFormatY}>
                      <select
                        className="view-input"
                        value={s.chartAxisLabelFormatY}
                        onChange={(e) =>
                          s.set({
                            chartAxisLabelFormatY: e.target.value as
                              | 'normal'
                              | 'scientific_e'
                              | 'scientific_10',
                          })
                        }
                      >
                        <option value="normal">{t.settingsChartAxisLabelFormatNormal}</option>
                        <option value="scientific_e">
                          {t.settingsChartAxisLabelFormatScientificE}
                        </option>
                        <option value="scientific_10">
                          {t.settingsChartAxisLabelFormatScientific10}
                        </option>
                      </select>
                    </Row>
                    <NumRow
                      label={t.settingsChartAxisTickMatchDigitsX}
                      value={s.chartAxisTickMatchDigitsX}
                      min={-3}
                      max={6}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartAxisTickMatchDigitsX: n })}
                    />
                    <NumRow
                      label={t.settingsChartAxisTickMatchDigitsY}
                      value={s.chartAxisTickMatchDigitsY}
                      min={-3}
                      max={6}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartAxisTickMatchDigitsY: n })}
                    />
                    <NumRow
                      label={t.settingsChartAxisLabelMaxChars}
                      value={s.chartLabelMaxLength}
                      min={0}
                      max={32}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartLabelMaxLength: n })}
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
                        <option value="inside-full">
                          {t.settingsChartAxisTickStyleInsideFull}
                        </option>
                        <option value="inside-half">
                          {t.settingsChartAxisTickStyleInsideHalf}
                        </option>
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
                  <Section title={t.settingsSectionChartCorrelation}>
                    <Row label={t.chartCorrelationMethod}>
                      <select
                        className="view-input"
                        value={s.chartCorrelationMethod ?? 'pearson'}
                        onChange={(e) =>
                          s.set({
                            chartCorrelationMethod: e.target.value as
                              | 'pearson'
                              | 'spearman'
                              | 'kendall',
                          })
                        }
                      >
                        <option value="pearson">{t.chartCorrelationMethodPearson}</option>
                        <option value="spearman">{t.chartCorrelationMethodSpearman}</option>
                        <option value="kendall">{t.chartCorrelationMethodKendall}</option>
                      </select>
                    </Row>
                    <Row label={t.chartCorrelationFill}>
                      <select
                        className="view-input"
                        value={s.chartCorrelationFillStyle ?? 'solid'}
                        onChange={(e) =>
                          s.set({
                            chartCorrelationFillStyle: e.target.value as
                              | 'none'
                              | 'solid'
                              | 'gradient'
                              | 'hatched'
                              | 'hatched-h'
                              | 'hatched-v'
                              | 'hatched-cross'
                              | 'stripes'
                              | 'pattern',
                          })
                        }
                      >
                        <option value="none">{t.styleNone}</option>
                        {FILL_STYLES.map((style) => (
                          <option key={style.value} value={style.value}>
                            {style.value === 'solid'
                              ? t.styleSolid
                              : style.value === 'gradient'
                                ? t.styleGradient
                                : style.value === 'hatched'
                                  ? t.styleHatched
                                  : style.value === 'hatched-h'
                                    ? t.styleHatchedH
                                    : style.value === 'hatched-v'
                                      ? t.styleHatchedV
                                      : style.value === 'hatched-cross'
                                        ? t.styleHatchedCross
                                        : style.value === 'stripes'
                                          ? t.styleStripes
                                          : t.stylePattern}
                          </option>
                        ))}
                      </select>
                    </Row>
                    <div className="panel-check-list">
                      <PanelCheck
                        label={t.chartCorrelationShowValues}
                        checked={s.chartCorrelationShowValues !== false}
                        onChange={(v) => s.set({ chartCorrelationShowValues: v })}
                      />
                    </div>
                    <NumRow
                      label={t.chartCorrelationDecimals}
                      value={s.chartCorrelationDecimals ?? 2}
                      min={0}
                      max={4}
                      defaultVal={2}
                      onChange={(n) => s.set({ chartCorrelationDecimals: n })}
                    />
                  </Section>
                  <Section title={t.settingsSectionChartBoxplot}>
                    <Row label={t.boxplotAlgorithm}>
                      <select
                        className="view-input"
                        value={s.chartBoxAlgorithm}
                        onChange={(e) =>
                          s.set({
                            chartBoxAlgorithm: e.target.value as
                              | 'custom'
                              | 'stacked'
                              | 'first_fit'
                              | 'best_fit',
                          })
                        }
                      >
                        <option value="custom">{t.boxplotAlgorithmCustom}</option>
                        <option value="stacked">{t.boxplotAlgorithmStacked}</option>
                        <option value="first_fit">{t.boxplotAlgorithmFirstFit}</option>
                        <option value="best_fit">{t.boxplotAlgorithmBestFit}</option>
                      </select>
                    </Row>
                    <Row label={t.boxplotFillStyle}>
                      <select
                        className="view-input"
                        value={s.chartBoxFillStyle}
                        onChange={(e) =>
                          s.set({
                            chartBoxFillStyle: e.target.value as
                              | 'solid'
                              | 'gradient'
                              | 'hatched'
                              | 'hatched-h'
                              | 'hatched-v'
                              | 'hatched-cross'
                              | 'stripes'
                              | 'pattern',
                          })
                        }
                      >
                        {FILL_STYLES.map((style) => (
                          <option key={style.value} value={style.value}>
                            {style.value === 'solid'
                              ? t.styleSolid
                              : style.value === 'gradient'
                                ? t.styleGradient
                                : style.value === 'hatched'
                                  ? t.styleHatched
                                  : style.value === 'hatched-h'
                                    ? t.styleHatchedH
                                    : style.value === 'hatched-v'
                                      ? t.styleHatchedV
                                      : style.value === 'hatched-cross'
                                        ? t.styleHatchedCross
                                        : style.value === 'stripes'
                                          ? t.styleStripes
                                          : t.stylePattern}
                          </option>
                        ))}
                      </select>
                    </Row>
                    <Row label={t.boxplotEdgeStyle}>
                      <select
                        className="view-input"
                        value={s.chartBoxEdgeStyle}
                        onChange={(e) =>
                          s.set({
                            chartBoxEdgeStyle: e.target.value as 'solid' | 'dashed' | 'dotted' | 'none',
                          })
                        }
                      >
                        <option value="solid">{t.styleSolid}</option>
                        <option value="dashed">{t.styleDashed}</option>
                        <option value="dotted">{t.styleDotted}</option>
                        <option value="none">{t.styleNoneBorder}</option>
                      </select>
                    </Row>
                    <NumRow
                      label={t.boxplotEdgeWidth}
                      value={s.chartBoxEdgeWidth}
                      min={0}
                      max={8}
                      step={0.5}
                      defaultVal={1}
                      onChange={(n) => s.set({ chartBoxEdgeWidth: n })}
                    />
                    <NumRow
                      label={t.boxplotCornerRadius}
                      value={s.chartBoxCornerRadius}
                      min={0}
                      max={20}
                      step={1}
                      defaultVal={0}
                      onChange={(n) => s.set({ chartBoxCornerRadius: n })}
                    />
                    <NumRow
                      label={t.boxplotOpacity}
                      value={s.chartBoxOpacity}
                      min={0}
                      max={1}
                      step={0.05}
                      defaultVal={0.85}
                      onChange={(n) => s.set({ chartBoxOpacity: n })}
                    />
                    <PanelCheck
                      label={t.boxplotMaxLine}
                      checked={s.chartBoxShowMaxLine}
                      onChange={(checked) => s.set({ chartBoxShowMaxLine: checked })}
                    />
                    <Row label={t.boxplotColor}>
                      <input
                        type="color"
                        className="view-input"
                        style={{ width: '100%', height: '22px', padding: '2px' }}
                        value={s.chartBoxColor}
                        onChange={(e) => s.set({ chartBoxColor: e.target.value })}
                      />
                    </Row>
                    <Row label={t.boxplotMaxLineColor}>
                      <input
                        type="color"
                        className="view-input"
                        style={{ width: '100%', height: '22px', padding: '2px' }}
                        value={s.chartBoxMaxLineColor}
                        onChange={(e) => s.set({ chartBoxMaxLineColor: e.target.value })}
                      />
                    </Row>
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
                    <NumRow
                      label={t.settingsGraphHeatStrokeWidthMultiplier}
                      value={s.graphHeatStrokeWidthMultiplier ?? 1.8}
                      min={0.5}
                      max={3}
                      step={0.1}
                      defaultVal={1.8}
                      onChange={(n) => s.set({ graphHeatStrokeWidthMultiplier: n })}
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
                    <ColorItem
                      id="chart-correlation-color-start"
                      label={t.chartCorrelationColorStart}
                      value={s.chartCorrelationColorStart ?? '#2563eb'}
                      onChange={(v) => s.set({ chartCorrelationColorStart: v })}
                    />
                    <ColorItem
                      id="chart-correlation-color-end"
                      label={t.chartCorrelationColorEnd}
                      value={s.chartCorrelationColorEnd ?? '#dc2626'}
                      onChange={(v) => s.set({ chartCorrelationColorEnd: v })}
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
        </div>
        <section className="view-menu-about" aria-label={t.settingsAbout}>
          <a
            href="https://github.com/lancerstadium/xovis"
            target="_blank"
            rel="noopener noreferrer"
            className="view-menu-about-link"
            aria-label="GitHub"
          >
            <svg className="view-menu-about-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Github
          </a>
          <span className="view-menu-about-item" title="Author">
            <svg className="view-menu-about-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            lancerstadium
          </span>
          <span className="view-menu-about-item" title={t.settingsAboutLicense}>
            <svg className="view-menu-about-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            {t.settingsAboutLicense}
          </span>
        </section>
      </div>
      </div>
    </div>
  );

  return createPortal(dropdown, document.body);
}
