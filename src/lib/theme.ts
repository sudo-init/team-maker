import { readStored, writeStored } from './storage';

/** system은 운영체제 설정을 따른다. */
export type ThemePreference = 'system' | 'light' | 'dark';

// index.html의 깜빡임 방지 스크립트도 같은 키를 읽는다. 바꾸면 둘 다 바꿔야 한다.
const THEME_KEY = 'theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

const isPreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

export function loadTheme(): ThemePreference {
  return readStored(THEME_KEY, value => (isPreference(value) ? value : null)) ?? 'system';
}

export function saveTheme(preference: ThemePreference): void {
  writeStored(THEME_KEY, preference);
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}

/** 운영체제 설정이 바뀌면 알려준다. 해제 함수를 돌려준다. */
export function watchSystemTheme(onChange: () => void): () => void {
  if (typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): 'light' | 'dark' {
  if (preference === 'system') return prefersDark ? 'dark' : 'light';
  return preference;
}

/** html에 dark 클래스를 붙이고, 네이티브 입력 요소(select 등)도 같은 색 모드로 그리게 한다. */
export function applyTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

/** 버튼을 누를 때마다 system → light → dark 순으로 돈다. */
export function nextTheme(preference: ThemePreference): ThemePreference {
  return preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system';
}
