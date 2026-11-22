import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import {
  applyTheme,
  loadTheme,
  nextTheme,
  resolveTheme,
  saveTheme,
  systemPrefersDark,
  watchSystemTheme,
  type ThemePreference
} from '@/lib/theme';

const LABEL: Record<ThemePreference, string> = {
  system: '시스템 설정',
  light: '라이트 모드',
  dark: '다크 모드'
};

const ICON = { system: Monitor, light: Sun, dark: Moon };

const ThemeToggle = () => {
  const [preference, setPreference] = useState<ThemePreference>(loadTheme);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  useEffect(() => watchSystemTheme(() => setPrefersDark(systemPrefersDark())), []);

  useEffect(() => {
    applyTheme(resolveTheme(preference, prefersDark));
    saveTheme(preference);
  }, [preference, prefersDark]);

  const Icon = ICON[preference];
  const next = nextTheme(preference);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setPreference(next)}
      aria-label={`화면 모드: ${LABEL[preference]} (누르면 ${LABEL[next]})`}
      title={LABEL[preference]}
    >
      <Icon className="h-5 w-5" />
    </Button>
  );
};

export default ThemeToggle;
