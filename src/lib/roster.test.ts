import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_ROSTER,
  addNames,
  clearNames,
  loadRoster,
  normalizeRoster,
  removeName,
  saveRoster,
  setRules,
  setTeamCount,
  type Roster
} from './roster';
import { removeConstraint, upsertPair, upsertPin, type Constraints } from './constraints';
import { parseStoredNames, readStored } from './storage';

function roster(names: string[], teamCount = 2, rules: Constraints = { pairs: [], pins: [] }): Roster {
  return { names, teamCount, rules };
}

const rulesFor = (...steps: ((c: Constraints) => Constraints)[]) =>
  steps.reduce((acc, step) => step(acc), { pairs: [], pins: [] } as Constraints);

const pairOf = (a: string, b: string, kind: 'apart' | 'together' = 'apart') =>
  (c: Constraints) => upsertPair(c, kind, a, b).constraints;
const pinOf = (name: string, team: number) => (c: Constraints) => upsertPin(c, name, team).constraints;

describe('normalizeRoster', () => {
  it('팀 수를 인원 수와 최소값 사이로 맞춘다', () => {
    expect(normalizeRoster(roster(['가', '나', '다'], 9)).teamCount).toBe(3);
    expect(normalizeRoster(roster([], 5)).teamCount).toBe(2);
    expect(normalizeRoster(roster(['가', '나', '다'], 0)).teamCount).toBe(2);
  });

  it('없는 사람과 없는 팀을 가리키는 조건을 지운다', () => {
    const rules = rulesFor(pairOf('가', '나'), pinOf('다', 2));
    const next = normalizeRoster(roster(['가', '다'], 2, rules));
    expect(next.rules).toEqual({ pairs: [], pins: [] });
  });
});

describe('명단 편집', () => {
  it('중복은 건너뛰고 알려준다', () => {
    const { roster: next, duplicated } = addNames(roster(['가']), ['가', '나', '나']);
    expect(next.names).toEqual(['가', '나']);
    expect(duplicated).toEqual(['가', '나']);
  });

  it('아무도 추가되지 않으면 같은 객체를 돌려준다', () => {
    const before = roster(['가']);
    expect(addNames(before, ['가']).roster).toBe(before);
  });

  it('사람을 빼면 그 사람이 낀 조건과 넘치는 팀 수도 정리된다', () => {
    const rules = rulesFor(pairOf('가', '나'), pinOf('다', 2));
    const next = removeName(roster(['가', '나', '다'], 3, rules), '다');
    expect(next.teamCount).toBe(2);
    expect(next.rules.pins).toEqual([]);
    expect(next.rules.pairs).toHaveLength(1);
  });

  it('전체 삭제는 조건도 비운다', () => {
    const next = clearNames(roster(['가', '나'], 2, rulesFor(pairOf('가', '나'))));
    expect(next).toEqual(EMPTY_ROSTER);
  });
});

describe('setTeamCount', () => {
  it('범위 밖 값은 가까운 값으로 맞추고, 바뀐 게 없으면 같은 객체', () => {
    const before = roster(['가', '나', '다'], 3);
    expect(setTeamCount(before, 4).roster).toBe(before);
    expect(setTeamCount(before, 2).roster.teamCount).toBe(2);
  });

  it('줄어든 팀에 걸린 고정 수를 알려준다', () => {
    const before = roster(['가', '나', '다'], 3, rulesFor(pinOf('가', 2), pinOf('나', 0)));
    const { roster: next, droppedPins } = setTeamCount(before, 2);
    expect(droppedPins).toBe(1);
    expect(next.rules.pins.map(pin => pin.name)).toEqual(['나']);
  });
});

describe('조건 편집', () => {
  it('같은 짝에 다른 종류를 걸면 갈아끼운다', () => {
    const first = upsertPair({ pairs: [], pins: [] }, 'apart', '가', '나');
    const second = upsertPair(first.constraints, 'together', '나', '가');
    expect(first.change).toBe('added');
    expect(second.change).toBe('replaced');
    expect(second.constraints.pairs).toHaveLength(1);
    expect(second.constraints.pairs[0].kind).toBe('together');
  });

  it('똑같은 조건은 duplicate로 알려주고 바꾸지 않는다', () => {
    const first = upsertPin({ pairs: [], pins: [] }, '가', 1);
    const again = upsertPin(first.constraints, '가', 1);
    expect(again.change).toBe('duplicate');
    expect(again.constraints).toBe(first.constraints);
    expect(upsertPin(first.constraints, '가', 0).change).toBe('replaced');
  });

  it('id로 짝·고정 어느 쪽이든 지운다', () => {
    const rules = rulesFor(pairOf('가', '나'), pinOf('다', 1));
    const withoutPair = removeConstraint(rules, rules.pairs[0].id);
    const withoutPin = removeConstraint(rules, rules.pins[0].id);
    expect(withoutPair.pairs).toEqual([]);
    expect(withoutPin.pins).toEqual([]);
  });

  it('setRules도 지금 명단 기준으로 정리한다', () => {
    const next = setRules(roster(['가', '나']), rulesFor(pairOf('가', '없음')));
    expect(next.rules.pairs).toEqual([]);
  });
});

describe('저장과 복원', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key)
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('저장한 명단을 그대로 되살린다', () => {
    const saved = roster(['가', '나', '다'], 3, rulesFor(pairOf('가', '나'), pinOf('다', 2)));
    saveRoster(saved);
    expect(loadRoster()).toEqual(saved);
  });

  it('예전 버전이 문자열로 저장한 팀 수도 읽는다', () => {
    store.set('randomTeamNames', JSON.stringify(['가', '나', '다']));
    store.set('randomTeamCount', '3');
    expect(loadRoster().teamCount).toBe(3);
  });

  it('깨진 값은 지우고 기본값으로 시작한다', () => {
    store.set('randomTeamNames', '{not json');
    store.set('randomTeamConstraints', JSON.stringify('엉뚱한 값'));
    expect(loadRoster()).toEqual(EMPTY_ROSTER);
    expect(store.has('randomTeamNames')).toBe(false);
    expect(store.has('randomTeamConstraints')).toBe(false);
  });

  it('저장소 자체가 막혀 있어도 예외를 던지지 않는다', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {
        throw new Error('SecurityError');
      }
    });
    expect(() => saveRoster(EMPTY_ROSTER)).not.toThrow();
    expect(loadRoster()).toEqual(EMPTY_ROSTER);
    expect(readStored('x', parseStoredNames)).toBeNull();
  });
});

describe('parseStoredNames', () => {
  it('공백을 다듬고 빈 값과 중복을 지운다', () => {
    expect(parseStoredNames([' 가 ', '가', ' ', '나'])).toEqual(['가', '나']);
  });

  it('문자열 배열이 아니면 null', () => {
    expect(parseStoredNames('가')).toBeNull();
    expect(parseStoredNames(['가', 1])).toBeNull();
  });
});
