import { describe, expect, it } from 'vitest';
import { nextTheme, resolveTheme } from './theme';

describe('theme', () => {
  it('system은 운영체제 설정을 따른다', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('system → light → dark → system 순으로 돈다', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
});
