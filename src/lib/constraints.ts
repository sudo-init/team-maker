import { createId } from './id';

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

/** 조건 식별자. 이름이 바뀌어도 안 흔들리게 값과 분리해 둔다. */
export function createConstraintId(): string {
  return createId('c');
}

/** 두 사람이 순서에 관계없이 같은 짝인지. */
export function isSamePair(pair: PairConstraint, a: string, b: string): boolean {
  return (pair.a === a && pair.b === b) || (pair.a === b && pair.b === a);
}

/**
 * 조건을 추가한 결과.
 * - added: 새로 들어갔다.
 * - replaced: 같은 대상에 걸린 기존 조건을 새 조건으로 갈아끼웠다.
 * - duplicate: 똑같은 조건이 이미 있어 아무것도 바뀌지 않았다.
 */
export type ConstraintChange = 'added' | 'replaced' | 'duplicate';

/**
 * 두 사람 사이에 조건을 건다.
 * 같은 짝에 '같은 팀'과 '다른 팀'이 동시에 걸리면 모순이므로 기존 조건은 새 조건으로 바꾼다.
 */
export function upsertPair(
  constraints: Constraints,
  kind: PairKind,
  a: string,
  b: string
): { constraints: Constraints; change: ConstraintChange } {
  const existing = constraints.pairs.find(pair => isSamePair(pair, a, b));
  if (existing?.kind === kind) return { constraints, change: 'duplicate' };

  return {
    constraints: {
      pairs: [
        ...constraints.pairs.filter(pair => pair !== existing),
        { id: createConstraintId(), kind, a, b }
      ],
      pins: constraints.pins
    },
    change: existing ? 'replaced' : 'added'
  };
}

/** 사람을 팀에 고정한다. 한 사람이 두 팀에 고정될 수는 없으니 기존 고정은 갈아끼운다. */
export function upsertPin(
  constraints: Constraints,
  name: string,
  teamIndex: number
): { constraints: Constraints; change: ConstraintChange } {
  const existing = constraints.pins.find(pin => pin.name === name);
  if (existing?.teamIndex === teamIndex) return { constraints, change: 'duplicate' };

  return {
    constraints: {
      pairs: constraints.pairs,
      pins: [
        ...constraints.pins.filter(pin => pin !== existing),
        { id: createConstraintId(), name, teamIndex }
      ]
    },
    change: existing ? 'replaced' : 'added'
  };
}

/** id로 조건 하나를 지운다. 짝 조건인지 고정 조건인지는 따지지 않는다. */
export function removeConstraint(constraints: Constraints, id: string): Constraints {
  return {
    pairs: constraints.pairs.filter(pair => pair.id !== id),
    pins: constraints.pins.filter(pin => pin.id !== id)
  };
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
