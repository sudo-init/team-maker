import { describe, expect, it } from 'vitest';
import { parseNames, shuffle, splitIntoTeams, type SplitResult } from './team';
import {
  createConstraintId,
  pruneConstraints,
  parseStoredConstraints,
  type Constraints,
  type PairKind
} from './constraints';

const ROSTER = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차'];

function constraints(input: Partial<Constraints> = {}): Constraints {
  return { pairs: input.pairs ?? [], pins: input.pins ?? [] };
}

function pair(kind: PairKind, a: string, b: string) {
  return { id: createConstraintId(), kind, a, b };
}

function pin(name: string, teamIndex: number) {
  return { id: createConstraintId(), name, teamIndex };
}

function expectOk(result: SplitResult): string[][] {
  if (!result.ok) throw new Error(`팀 나누기가 실패했습니다: ${result.reason}`);
  return result.teams;
}

function teamOf(teams: string[][], name: string): number {
  return teams.findIndex(team => team.includes(name));
}

/** 조건이 걸린 결과는 한 번 성공했다고 안심할 수 없어 여러 번 돌려본다. */
function repeat(times: number, run: (attempt: number) => void) {
  for (let attempt = 0; attempt < times; attempt++) run(attempt);
}

describe('parseNames', () => {
  it('쉼표와 줄바꿈으로 나누고 앞뒤 공백을 지운다', () => {
    expect(parseNames('가나, 다라\n마바')).toEqual(['가나', '다라', '마바']);
  });

  it('이름 안의 공백은 살린다', () => {
    expect(parseNames('홍 길동, 김 철수')).toEqual(['홍 길동', '김 철수']);
  });

  it('윈도우 줄바꿈과 빈 조각을 걸러낸다', () => {
    expect(parseNames('가\r\n나,,  ,\n다')).toEqual(['가', '나', '다']);
  });

  it('내용이 없으면 빈 배열', () => {
    expect(parseNames('  ,\n , ')).toEqual([]);
  });
});

describe('shuffle', () => {
  it('원본을 건드리지 않고 같은 원소를 그대로 돌려준다', () => {
    const original = [...ROSTER];
    const shuffled = shuffle(original);

    expect(original).toEqual(ROSTER);
    expect([...shuffled].sort()).toEqual([...ROSTER].sort());
  });
});

describe('splitIntoTeams - 기본 분배', () => {
  it('모든 인원이 빠짐없이 한 번씩 배정된다', () => {
    repeat(50, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 2));
      const everyone = teams.flat();

      expect(everyone).toHaveLength(ROSTER.length);
      expect(new Set(everyone).size).toBe(ROSTER.length);
    });
  });

  it('나누어떨어지지 않아도 팀 간 인원 차이는 최대 1명이다', () => {
    repeat(50, () => {
      for (const teamCount of [2, 3, 4, 7]) {
        const teams = expectOk(splitIntoTeams(ROSTER.slice(0, 7), teamCount));
        const sizes = teams.map(team => team.length);

        expect(teams).toHaveLength(teamCount);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
      }
    });
  });

  it('인원이 팀 수보다 적으면 이유를 알려준다', () => {
    const result = splitIntoTeams(['가', '나'], 3);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('최소 3명');
  });

  it('팀이 2개 미만이면 거절한다', () => {
    expect(splitIntoTeams(ROSTER, 1).ok).toBe(false);
  });

  it('돌릴 때마다 결과가 달라진다', () => {
    const seen = new Set<string>();
    repeat(30, () => {
      seen.add(JSON.stringify(expectOk(splitIntoTeams(ROSTER, 2))));
    });

    expect(seen.size).toBeGreaterThan(1);
  });

  it('특정 인원이 한쪽 팀에 쏠리지 않는다', () => {
    const counts = [0, 0];
    repeat(600, () => {
      counts[teamOf(expectOk(splitIntoTeams(ROSTER, 2)), '가')] += 1;
    });

    // 완전히 고르면 300:300. 편향만 잡아내면 되므로 넉넉하게 본다.
    expect(counts[0]).toBeGreaterThan(200);
    expect(counts[1]).toBeGreaterThan(200);
  });
});

describe('splitIntoTeams - 다른 팀 조건', () => {
  it('지정한 두 사람은 항상 갈라진다', () => {
    const rule = constraints({ pairs: [pair('apart', '가', '나')] });

    repeat(100, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 2, rule));
      expect(teamOf(teams, '가')).not.toBe(teamOf(teams, '나'));
    });
  });

  it('여러 쌍을 동시에 갈라놓는다', () => {
    const rule = constraints({
      pairs: [pair('apart', '가', '나'), pair('apart', '다', '라'), pair('apart', '마', '바')]
    });

    repeat(100, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 2, rule));

      expect(teamOf(teams, '가')).not.toBe(teamOf(teams, '나'));
      expect(teamOf(teams, '다')).not.toBe(teamOf(teams, '라'));
      expect(teamOf(teams, '마')).not.toBe(teamOf(teams, '바'));
    });
  });

  it('서로 갈라야 하는 사람이 팀 수보다 많으면 실패한다', () => {
    const rule = constraints({
      pairs: [pair('apart', '가', '나'), pair('apart', '나', '다'), pair('apart', '가', '다')]
    });
    const result = splitIntoTeams(ROSTER, 2, rule);

    expect(result.ok).toBe(false);
  });

  it('팀을 하나 더 늘리면 같은 조건이 풀린다', () => {
    const rule = constraints({
      pairs: [pair('apart', '가', '나'), pair('apart', '나', '다'), pair('apart', '가', '다')]
    });
    const teams = expectOk(splitIntoTeams(ROSTER, 3, rule));

    expect(new Set([teamOf(teams, '가'), teamOf(teams, '나'), teamOf(teams, '다')]).size).toBe(3);
  });
});

describe('splitIntoTeams - 같은 팀 조건', () => {
  it('지정한 두 사람은 항상 붙어 있다', () => {
    const rule = constraints({ pairs: [pair('together', '가', '나')] });

    repeat(100, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 2, rule));
      expect(teamOf(teams, '가')).toBe(teamOf(teams, '나'));
    });
  });

  it('조건이 사슬처럼 이어지면 셋 다 같은 팀이 된다', () => {
    const rule = constraints({
      pairs: [pair('together', '가', '나'), pair('together', '나', '다')]
    });

    repeat(50, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 2, rule));
      expect(new Set([teamOf(teams, '가'), teamOf(teams, '나'), teamOf(teams, '다')]).size).toBe(1);
    });
  });

  it('묶인 인원이 한 팀 정원을 넘으면 이유를 알려준다', () => {
    const rule = constraints({
      pairs: [
        pair('together', '가', '나'),
        pair('together', '나', '다'),
        pair('together', '다', '라'),
        pair('together', '라', '마'),
        pair('together', '마', '바')
      ]
    });
    const result = splitIntoTeams(ROSTER, 2, rule);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('정원');
  });

  it('같은 팀과 다른 팀 조건이 부딪히면 이유를 알려준다', () => {
    const rule = constraints({
      pairs: [pair('together', '가', '나'), pair('apart', '가', '나')]
    });
    const result = splitIntoTeams(ROSTER, 2, rule);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('다른 팀에 둘 수 없어요');
  });

  it('사슬로 이어진 사람과 다른 팀 조건이 겹쳐도 잡아낸다', () => {
    const rule = constraints({
      pairs: [pair('together', '가', '나'), pair('together', '나', '다'), pair('apart', '가', '다')]
    });

    expect(splitIntoTeams(ROSTER, 2, rule).ok).toBe(false);
  });
});

describe('splitIntoTeams - 팀 고정 조건', () => {
  it('고정한 사람은 지정한 팀에 들어간다', () => {
    const rule = constraints({ pins: [pin('가', 2)] });

    repeat(50, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 3, rule));
      expect(teamOf(teams, '가')).toBe(2);
    });
  });

  it('같은 팀으로 묶인 사람은 고정을 따라간다', () => {
    const rule = constraints({
      pairs: [pair('together', '가', '나')],
      pins: [pin('가', 1)]
    });

    repeat(50, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 2, rule));
      expect(teamOf(teams, '나')).toBe(1);
    });
  });

  it('한 묶음이 서로 다른 팀에 고정되면 실패한다', () => {
    const rule = constraints({
      pairs: [pair('together', '가', '나')],
      pins: [pin('가', 0), pin('나', 1)]
    });
    const result = splitIntoTeams(ROSTER, 2, rule);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('고정');
  });

  it('다른 팀 조건인 두 사람을 같은 팀에 고정하면 실패한다', () => {
    const rule = constraints({
      pairs: [pair('apart', '가', '나')],
      pins: [pin('가', 0), pin('나', 0)]
    });

    expect(splitIntoTeams(ROSTER, 2, rule).ok).toBe(false);
  });

  it('없는 팀에 고정돼 있으면 이유를 알려준다', () => {
    const result = splitIntoTeams(ROSTER, 2, constraints({ pins: [pin('가', 4)] }));

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain('벗어났어요');
  });

  it('고정이 많아도 인원 균형은 지켜진다', () => {
    const rule = constraints({ pins: [pin('가', 0), pin('나', 0), pin('다', 1), pin('라', 1)] });

    repeat(50, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 2, rule));
      expect(teams.map(team => team.length)).toEqual([5, 5]);
    });
  });
});

describe('splitIntoTeams - 조건 조합', () => {
  it('세 종류를 한꺼번에 걸어도 모두 지킨다', () => {
    const rule = constraints({
      pairs: [
        pair('apart', '가', '나'),
        pair('apart', '다', '라'),
        pair('together', '마', '바'),
        pair('together', '사', '아')
      ],
      pins: [pin('가', 0), pin('자', 1)]
    });

    repeat(100, () => {
      const teams = expectOk(splitIntoTeams(ROSTER, 2, rule));

      expect(teamOf(teams, '가')).not.toBe(teamOf(teams, '나'));
      expect(teamOf(teams, '다')).not.toBe(teamOf(teams, '라'));
      expect(teamOf(teams, '마')).toBe(teamOf(teams, '바'));
      expect(teamOf(teams, '사')).toBe(teamOf(teams, '아'));
      expect(teamOf(teams, '가')).toBe(0);
      expect(teamOf(teams, '자')).toBe(1);
      expect(teams.map(team => team.length)).toEqual([5, 5]);
    });
  });

  it('조건이 걸려도 결과가 매번 고정되지는 않는다', () => {
    const rule = constraints({ pairs: [pair('apart', '가', '나')] });
    const seen = new Set<string>();

    repeat(30, () => {
      seen.add(JSON.stringify(expectOk(splitIntoTeams(ROSTER, 2, rule))));
    });

    expect(seen.size).toBeGreaterThan(1);
  });

  it('참가자에 없는 사람이 낀 조건은 무시한다', () => {
    const rule = constraints({
      pairs: [pair('apart', '가', '없는사람')],
      pins: [pin('없는사람', 1)]
    });

    expect(splitIntoTeams(ROSTER, 2, rule).ok).toBe(true);
  });
});

describe('splitIntoTeams - 탐색 한도', () => {
  it('한도에 걸려 멈추면 불가능과 다른 이유를 알려준다', () => {
    const result = splitIntoTeams(ROSTER, 2, constraints(), { stepLimit: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('다시 시도');
  });

  it('정말 불가능하면 조건을 줄이라고 안내한다', () => {
    const rule = constraints({
      pairs: [pair('apart', '가', '나'), pair('apart', '나', '다'), pair('apart', '가', '다')]
    });
    const result = splitIntoTeams(['가', '나', '다', '라'], 2, rule);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('조건을 줄이거나');
  });
});

describe('pruneConstraints', () => {
  it('빠진 사람이 낀 조건과 사라진 팀 고정을 걸러낸다', () => {
    const rule = constraints({
      pairs: [pair('apart', '가', '나'), pair('together', '가', '없는사람')],
      pins: [pin('가', 0), pin('나', 3)]
    });
    const pruned = pruneConstraints(rule, ['가', '나'], 2);

    expect(pruned.pairs).toHaveLength(1);
    expect(pruned.pairs[0].b).toBe('나');
    expect(pruned.pins).toHaveLength(1);
    expect(pruned.pins[0].teamIndex).toBe(0);
  });
});

describe('parseStoredConstraints', () => {
  it('정상적인 값을 그대로 되살린다', () => {
    const stored = constraints({ pairs: [pair('apart', '가', '나')], pins: [pin('다', 1)] });

    expect(parseStoredConstraints(JSON.parse(JSON.stringify(stored)))).toEqual(stored);
  });

  it('모양이 다르면 null', () => {
    expect(parseStoredConstraints(null)).toBeNull();
    expect(parseStoredConstraints(['가'])).toBeNull();
    expect(parseStoredConstraints({ pairs: '가' })).toBeNull();
  });

  it('깨진 항목만 걸러내고 성한 것은 살린다', () => {
    const parsed = parseStoredConstraints({
      pairs: [
        { id: '1', kind: 'apart', a: '가', b: '나' },
        { id: '2', kind: 'unknown', a: '가', b: '다' },
        { id: '3', kind: 'together', a: '가', b: '가' }
      ],
      pins: [
        { id: '4', name: '가', teamIndex: 0 },
        { id: '5', name: '나', teamIndex: -1 },
        { id: '6', name: '다', teamIndex: '1' }
      ]
    });

    expect(parsed?.pairs).toHaveLength(1);
    expect(parsed?.pins).toHaveLength(1);
  });
});
