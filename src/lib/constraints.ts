/** 두 사람 사이에 거는 조건. */
export type PairKind = 'together' | 'apart';

export interface PairConstraint {
  id: string;
  kind: PairKind;
  a: string;
  b: string;
}

/** 특정 사람을 특정 팀에 묶어두는 조건. teamIndex는 0부터 센다. */
export interface PinConstraint {
  id: string;
  name: string;
  teamIndex: number;
}

export interface Constraints {
  pairs: PairConstraint[];
  pins: PinConstraint[];
}

export const EMPTY_CONSTRAINTS: Constraints = { pairs: [], pins: [] };

export const PAIR_KIND_LABEL: Record<PairKind, string> = {
  together: '같은 팀',
  apart: '다른 팀'
};

let idCounter = 0;

/** 조건 목록의 React key 겸 삭제용 식별자. 이름이 바뀌어도 안 흔들리게 값과 분리해 둔다. */
export function createConstraintId(): string {
  idCounter += 1;
  return `c${Date.now().toString(36)}-${idCounter}`;
}

/** 두 사람이 순서에 관계없이 같은 짝인지. */
export function isSamePair(pair: PairConstraint, a: string, b: string): boolean {
  return (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a);
}

/**
 * 참가자 목록에서 빠진 사람이나 사라진 팀을 가리키는 조건을 걸러낸다.
 * 참가자를 지우거나 팀 개수를 줄였을 때 유령 조건이 남아 팀 짜기가 실패하는 걸 막는다.
 */
export function pruneConstraints(
  constraints: Constraints,
  names: string[],
  teamCount: number
): Constraints {
  const roster = new Set(names);
  return {
    pairs: constraints.pairs.filter(pair => roster.has(pair.a) && roster.has(pair.b)),
    pins: constraints.pins.filter(
      pin => roster.has(pin.name) && pin.teamIndex >= 0 && pin.teamIndex < teamCount
    )
  };
}

function isPairConstraint(value: unknown): value is PairConstraint {
  if (typeof value !== 'object' || value === null) return false;
  const pair = value as Record<string, unknown>;
  return (
    typeof pair.id === 'string' &&
    (pair.kind === 'together' || pair.kind === 'apart') &&
    typeof pair.a === 'string' &&
    typeof pair.b === 'string' &&
    pair.a !== pair.b
  );
}

function isPinConstraint(value: unknown): value is PinConstraint {
  if (typeof value !== 'object' || value === null) return false;
  const pin = value as Record<string, unknown>;
  return (
    typeof pin.id === 'string' &&
    typeof pin.name === 'string' &&
    typeof pin.teamIndex === 'number' &&
    Number.isInteger(pin.teamIndex) &&
    pin.teamIndex >= 0
  );
}

/**
 * localStorage에서 읽은 값을 조건으로 되살린다.
 * 모양이 아예 다르면 null, 일부만 깨졌으면 성한 것만 살려서 돌려준다.
 */
export function parseStoredConstraints(value: unknown): Constraints | null {
  if (typeof value !== 'object' || value === null) return null;

  const stored = value as Record<string, unknown>;
  if (!Array.isArray(stored.pairs) || !Array.isArray(stored.pins)) return null;

  return {
    pairs: stored.pairs.filter(isPairConstraint),
    pins: stored.pins.filter(isPinConstraint)
  };
}
