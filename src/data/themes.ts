export type AccentThemeId =
  | 'aqua'
  | 'green'
  | 'red'
  | 'amber'
  | 'purple'
  | 'white';

export interface AccentTheme {
  id: AccentThemeId;
  name: string;
  swatch: string;
  core: string;
  bright: string;
  glow: string;
  mid: string;
  deep: string;
  gradientEnd: string;
  heroMid: string;
  btnInk: string;
  bgTint: string;
  accentRgb: string;
  glowRgb: string;
  secondaryRgb: string;
  softRgb: string;
  midRgb: string;
}

export const DEFAULT_THEME_ID: AccentThemeId = 'aqua';
const STORAGE_THEME_KEY = 'portfolio_accent_theme_v1';

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'aqua',
    name: 'Aqua',
    swatch: '#00F0FF',
    core: '#00f0ff',
    bright: '#5ff6ff',
    glow: '#22d3ee',
    mid: '#0891b2',
    deep: '#0e7490',
    gradientEnd: '#0ea5e9',
    heroMid: '#bae6fd',
    btnInk: '#02121f',
    bgTint: '#091628',
    accentRgb: '0, 240, 255',
    glowRgb: '34, 211, 238',
    secondaryRgb: '14, 165, 233',
    softRgb: '165, 243, 252',
    midRgb: '8, 145, 178',
  },
  {
    id: 'green',
    name: 'Tech Green',
    swatch: '#00FF88',
    core: '#00ff88',
    bright: '#6ee7b7',
    glow: '#34d399',
    mid: '#059669',
    deep: '#047857',
    gradientEnd: '#10b981',
    heroMid: '#bbf7d0',
    btnInk: '#02180e',
    bgTint: '#061b14',
    accentRgb: '0, 255, 136',
    glowRgb: '52, 211, 153',
    secondaryRgb: '16, 185, 129',
    softRgb: '167, 243, 208',
    midRgb: '5, 150, 105',
  },
  {
    id: 'red',
    name: 'Pulse Red',
    swatch: '#FF3B5C',
    core: '#ff3b5c',
    bright: '#ff8096',
    glow: '#fb7185',
    mid: '#e11d48',
    deep: '#9f1239',
    gradientEnd: '#f97316',
    heroMid: '#fecdd3',
    btnInk: '#1d050a',
    bgTint: '#1e0911',
    accentRgb: '255, 59, 92',
    glowRgb: '251, 113, 133',
    secondaryRgb: '249, 115, 22',
    softRgb: '254, 205, 211',
    midRgb: '225, 29, 72',
  },
  {
    id: 'amber',
    name: 'Amber',
    swatch: '#FFB800',
    core: '#ffb800',
    bright: '#fde047',
    glow: '#fbbf24',
    mid: '#d97706',
    deep: '#b45309',
    gradientEnd: '#f97316',
    heroMid: '#fef08a',
    btnInk: '#1b1102',
    bgTint: '#1c1406',
    accentRgb: '255, 184, 0',
    glowRgb: '251, 191, 36',
    secondaryRgb: '245, 158, 11',
    softRgb: '254, 240, 138',
    midRgb: '217, 119, 6',
  },
  {
    id: 'purple',
    name: 'Ultraviolet',
    swatch: '#B56BFF',
    core: '#b56bff',
    bright: '#d8b4fe',
    glow: '#c084fc',
    mid: '#9333ea',
    deep: '#6b21a8',
    gradientEnd: '#6366f1',
    heroMid: '#e9d5ff',
    btnInk: '#120624',
    bgTint: '#150a26',
    accentRgb: '181, 107, 255',
    glowRgb: '192, 132, 252',
    secondaryRgb: '129, 140, 248',
    softRgb: '233, 213, 255',
    midRgb: '147, 51, 234',
  },
  {
    id: 'white',
    name: 'Titanium White',
    swatch: '#E8F1FF',
    core: '#e8f1ff',
    bright: '#ffffff',
    glow: '#cbd5e1',
    mid: '#94a3b8',
    deep: '#64748b',
    gradientEnd: '#94a3b8',
    heroMid: '#f8fafc',
    btnInk: '#090d14',
    bgTint: '#111722',
    accentRgb: '232, 241, 255',
    glowRgb: '203, 213, 225',
    secondaryRgb: '148, 163, 184',
    softRgb: '241, 245, 249',
    midRgb: '148, 163, 184',
  },
];

export function getThemeById(id: string | null | undefined): AccentTheme {
  return (
    ACCENT_THEMES.find((t) => t.id === id) ??
    ACCENT_THEMES[0]
  );
}

export function loadSavedThemeId(): AccentThemeId {
  try {
    if (typeof localStorage === 'undefined') return DEFAULT_THEME_ID;
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved && ACCENT_THEMES.some((t) => t.id === saved)) {
      return saved as AccentThemeId;
    }
  } catch {
    // Ignore storage errors
  }
  return DEFAULT_THEME_ID;
}

export function saveThemeId(id: AccentThemeId): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_THEME_KEY, id);
  } catch {
    // Ignore storage errors
  }
}

export function applyThemeToDocument(theme: AccentTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  root.setProperty('--aqua-core', theme.core);
  root.setProperty('--aqua-bright', theme.bright);
  root.setProperty('--aqua-glow', theme.glow);
  root.setProperty('--aqua-mid', theme.mid);
  root.setProperty('--aqua-deep', theme.deep);
  root.setProperty('--gradient-end', theme.gradientEnd);
  root.setProperty('--hero-mid', theme.heroMid);
  root.setProperty('--btn-ink', theme.btnInk);
  root.setProperty('--bg-tint', theme.bgTint);
  root.setProperty('--accent-rgb', theme.accentRgb);
  root.setProperty('--glow-rgb', theme.glowRgb);
  root.setProperty('--secondary-rgb', theme.secondaryRgb);
  root.setProperty('--soft-rgb', theme.softRgb);
}
