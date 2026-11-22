import { describe, expect, it } from 'vitest';
import { formatMatchText, formatScore, formatTeamsText } from './share';

describe('formatScore', () => {
  it('소수 둘째 자리까지, 끝의 0은 뗀다', () => {
    expect(formatScore(7)).toBe('7');
    expect(formatScore(6.333)).toBe('6.33');
    expect(formatScore(2.5)).toBe('2.5');
    expect(formatScore(0.036)).toBe('0.04');
  });
});

describe('formatTeamsText', () => {
  it('팀마다 한 줄', () => {
    expect(formatTeamsText([['가', '나'], ['다']])).toBe(
      '[팀 나누기 결과]\n1팀 (2명): 가, 나\n2팀 (1명): 다'
    );
  });

  it('평균 점수를 함께 적는다', () => {
    expect(formatTeamsText([['가'], ['나']], [5, 4.256])).toBe(
      '[팀 나누기 결과]\n1팀 (1명 · 평균 5): 가\n2팀 (1명 · 평균 4.26): 나'
    );
  });
});

describe('formatMatchText', () => {
  it('포지션별로 양 팀 선수를 마주 놓는다', () => {
    const text = formatMatchText({
      teamA: [{ name: '가', position: 'TOP' }],
      teamB: [{ name: '나', position: 'TOP' }]
    });
    expect(text).toBe('[포지션별 팀 나누기]\nA팀 vs B팀\nTOP: 가 vs 나');
  });
});
