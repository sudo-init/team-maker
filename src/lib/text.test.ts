import { describe, expect, it } from 'vitest';
import { josa, relativeTime, teamSizeSummary } from './text';

describe('josa', () => {
  it('받침이 없으면 앞의 조사를 붙인다', () => {
    expect(josa('철수', '와/과')).toBe('와');
    expect(josa('지아', '은/는')).toBe('는');
    expect(josa('하나', '을/를')).toBe('를');
  });

  it('받침이 있으면 뒤의 조사를 붙인다', () => {
    expect(josa('민준', '와/과')).toBe('과');
    expect(josa('영민', '은/는')).toBe('은');
    expect(josa('서준', '을/를')).toBe('을');
  });

  it('조사 순서와 관계없이 받침 여부로 고른다', () => {
    expect(josa('철수', '과/와')).toBe('와');
    expect(josa('민준', '는/은')).toBe('은');
  });

  it('한글로 끝나지 않으면 두 형태를 함께 쓴다', () => {
    expect(josa('Alex', '와/과')).toBe('와(과)');
    expect(josa('', '은/는')).toBe('은(는)');
    expect(josa('7번', '은/는')).toBe('은');
  });
});

describe('teamSizeSummary', () => {
  it('딱 나누어떨어지면 한 숫자로 말한다', () => {
    expect(teamSizeSummary(8, 2)).toBe('4명씩 2팀');
  });

  it('나머지가 있으면 범위로 말한다', () => {
    expect(teamSizeSummary(10, 3)).toBe('3~4명씩 3팀');
  });

  it('사람이 팀보다 적으면 빈 문자열', () => {
    expect(teamSizeSummary(1, 2)).toBe('');
    expect(teamSizeSummary(0, 2)).toBe('');
  });
});

describe('relativeTime', () => {
  const now = Date.UTC(2026, 10, 23, 12);
  const MIN = 60_000;

  it('지난 시간을 가장 큰 단위로 말한다', () => {
    expect(relativeTime(now - 10_000, now)).toBe('방금 전');
    expect(relativeTime(now - 3 * MIN, now)).toBe('3분 전');
    expect(relativeTime(now - 125 * MIN, now)).toBe('2시간 전');
    expect(relativeTime(now - 3 * 24 * 60 * MIN, now)).toBe('3일 전');
  });

  it('일주일이 넘었거나 미래 시각이면 빈 문자열', () => {
    expect(relativeTime(now - 8 * 24 * 60 * MIN, now)).toBe('');
    expect(relativeTime(now + MIN, now)).toBe('');
  });
});
