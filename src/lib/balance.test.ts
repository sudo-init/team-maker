import { describe, expect, it } from 'vitest';
import { balanceTeams, parseScore, resolveScores, scoreSpread, teamAverages } from './balance';
import { upsertPair, upsertPin, type Constraints } from './constraints';

const NAMES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
// 1~8점. 합 36이라 4명씩 18점으로 딱 맞게 나눌 수 있다.
const SCORES = Object.fromEntries(NAMES.map((name, index) => [name, index + 1]));

function expectTeams(result: ReturnType<typeof balanceTeams>): string[][] {
  if (!result.ok) throw new Error(result.reason);
  return result.teams;
}

const teamOf = (teams: string[][], name: string) => teams.findIndex(team => team.includes(name));

describe('parseScore', () => {
  it('숫자만 받고 범위를 벗어나면 null', () => {
    expect(parseScore('7')).toBe(7);
    expect(parseScore(' 3.5 ')).toBe(3.5);
    expect(parseScore('')).toBeNull();
    expect(parseScore('abc')).toBeNull();
    expect(parseScore('-1')).toBeNull();
    expect(parseScore('100000')).toBeNull();
  });
});

describe('resolveScores', () => {
  it('점수가 없는 사람은 입력된 점수의 평균으로 친다', () => {
    const scoreOf = resolveScores(['a', 'b', 'c'], { a: 2, b: 4 });
    expect(scoreOf('c')).toBe(3);
  });

  it('아무도 점수가 없으면 모두 0', () => {
    expect(resolveScores(['a'], {})('a')).toBe(0);
  });
});

describe('teamAverages / scoreSpread', () => {
  it('팀별 평균과 최대-최소 차이를 계산한다', () => {
    const scoreOf = (name: string) => SCORES[name];
    const teams = [['a', 'h'], ['b', 'c']];
    expect(teamAverages(teams, scoreOf)).toEqual([4.5, 2.5]);
    expect(scoreSpread(teams, scoreOf)).toBe(2);
  });
});

describe('balanceTeams', () => {
  it('완벽히 나눌 수 있으면 평균 차이가 0이 된다', () => {
    for (let run = 0; run < 30; run++) {
      const teams = expectTeams(balanceTeams(NAMES, 2, undefined, SCORES));
      expect(scoreSpread(teams, name => SCORES[name])).toBeCloseTo(0);
      expect(teams.map(team => team.length)).toEqual([4, 4]);
    }
  });

  it('균형을 맞춰도 결과가 매번 같지는 않다', () => {
    const seen = new Set<string>();
    for (let run = 0; run < 30; run++) {
      const teams = expectTeams(balanceTeams(NAMES, 2, undefined, SCORES));
      seen.add(JSON.stringify(teams.map(team => [...team].sort()).sort()));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('조건(다른 팀·같은 팀·고정)을 지키면서 가능한 최선의 균형을 찾는다', () => {
    let rules: Constraints = { pairs: [], pins: [] };
    rules = upsertPair(rules, 'apart', 'g', 'h').constraints;
    rules = upsertPair(rules, 'together', 'a', 'b').constraints;
    rules = upsertPin(rules, 'c', 1).constraints;

    // 2팀 4:4는 경우의 수가 적어서 전부 따져 진짜 최선값을 구할 수 있다.
    const scoreOf = (name: string) => SCORES[name];
    let optimum = Infinity;
    for (let mask = 0; mask < 1 << NAMES.length; mask++) {
      const teamZero = NAMES.filter((_, index) => mask & (1 << index));
      if (teamZero.length !== 4) continue;
      const teams = [teamZero, NAMES.filter(name => !teamZero.includes(name))];
      if (teamOf(teams, 'g') === teamOf(teams, 'h')) continue;
      if (teamOf(teams, 'a') !== teamOf(teams, 'b')) continue;
      if (teamOf(teams, 'c') !== 1) continue;
      optimum = Math.min(optimum, scoreSpread(teams, scoreOf));
    }
    // 이 조건에서는 18:18이 불가능하다. 최선이 0이 아니어야 의미 있는 검증이다.
    expect(optimum).toBeGreaterThan(0);

    for (let run = 0; run < 30; run++) {
      const teams = expectTeams(balanceTeams(NAMES, 2, rules, SCORES));
      expect(teamOf(teams, 'g')).not.toBe(teamOf(teams, 'h'));
      expect(teamOf(teams, 'a')).toBe(teamOf(teams, 'b'));
      expect(teamOf(teams, 'c')).toBe(1);
      expect(scoreSpread(teams, scoreOf)).toBeCloseTo(optimum);
    }
  });

  it('여러 팀·나누어떨어지지 않는 인원에서도 무작위보다 고르게 나눈다', () => {
    const names = Array.from({ length: 23 }, (_, index) => `p${index}`);
    const scores = Object.fromEntries(names.map((name, index) => [name, (index * 37) % 100]));
    const scoreOf = (name: string) => scores[name];
    const teams = expectTeams(balanceTeams(names, 4, undefined, scores));

    expect(teams.flat().sort()).toEqual([...names].sort());
    expect(Math.max(...teams.map(t => t.length)) - Math.min(...teams.map(t => t.length))).toBeLessThanOrEqual(1);
    expect(scoreSpread(teams, scoreOf)).toBeLessThan(3);
  });

  it('조건이 모순이면 그 이유를 그대로 돌려준다', () => {
    const rules = upsertPair({ pairs: [], pins: [] }, 'together', 'a', 'b').constraints;
    const contradicted = upsertPin(upsertPin(rules, 'a', 0).constraints, 'b', 1).constraints;
    const result = balanceTeams(NAMES, 2, contradicted, SCORES);
    expect(result.ok).toBe(false);
  });
});
