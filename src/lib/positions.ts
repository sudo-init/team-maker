import { createId } from './id';

/** 포지션별 팀 나누기: 포지션마다 두 명을 받아 한 명씩 A팀·B팀으로 나눈다. */
export const POSITIONS = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'] as const;

export type Position = (typeof POSITIONS)[number];

export interface Player {
  name: string;
  position: Position;
}

/** 포지션마다 입력칸 두 개. */
export type PositionSlots = Record<Position, [string, string]>;

export interface PositionMatch {
  teamA: Player[];
  teamB: Player[];
}

export type PositionSplitResult = ({ ok: true } & PositionMatch) | { ok: false; reason: string };

export function emptySlots(): PositionSlots {
  return Object.fromEntries(POSITIONS.map(position => [position, ['', '']])) as PositionSlots;
}

/**
 * 포지션마다 두 사람의 팀을 무작위로 정한다.
 * 빈칸이 있거나 같은 사람이 두 칸 이상에 들어가면 팀을 만들지 않고 이유를 돌려준다.
 */
export function splitByPosition(
  slots: PositionSlots,
  random: () => number = Math.random
): PositionSplitResult {
  const trimmed = POSITIONS.map(position => slots[position].map(name => name.trim()));

  const emptyPositions = POSITIONS.filter((_, index) => trimmed[index].some(name => !name));
  if (emptyPositions.length > 0) {
    return { ok: false, reason: `선수를 모두 입력해주세요: ${emptyPositions.join(', ')}` };
  }

  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const name of trimmed.flat()) {
    if (seen.has(name)) duplicated.add(name);
    seen.add(name);
  }
  if (duplicated.size > 0) {
    return {
      ok: false,
      reason: `한 사람이 여러 칸에 들어가 있어요: ${[...duplicated].join(', ')}`
    };
  }

  const teamA: Player[] = [];
  const teamB: Player[] = [];
  POSITIONS.forEach((position, index) => {
    const [first, second] = trimmed[index];
    const firstGoesToA = random() < 0.5;
    teamA.push({ name: firstGoesToA ? first : second, position });
    teamB.push({ name: firstGoesToA ? second : first, position });
  });

  return { ok: true, teamA, teamB };
}

/** 저장해두는 팀 나누기 기록. */
export interface TeamRecord extends PositionMatch {
  id: string;
  /** 사람이 읽는 시각 문자열. 예전 기록과 모양을 맞추려고 저장 시점에 만들어 둔다. */
  date: string;
  /** 만든 시각(ms). "3분 전"처럼 보여주는 데 쓴다. 이 값이 생기기 전의 기록에는 없다. */
  createdAt?: number;
}

// localStorage 용량 초과를 막기 위해 최근 기록만 남긴다.
export const MAX_RECORDS = 50;

export function createRecord(match: PositionMatch, now = new Date()): TeamRecord {
  return { id: createId('r'), date: now.toLocaleString(), createdAt: now.getTime(), ...match };
}

function isPlayer(value: unknown): value is Player {
  if (typeof value !== 'object' || value === null) return false;
  const player = value as Record<string, unknown>;
  return (
    typeof player.name === 'string' &&
    (POSITIONS as readonly unknown[]).includes(player.position)
  );
}

function isTeam(value: unknown): value is Player[] {
  return Array.isArray(value) && value.every(isPlayer);
}

function isRecord(value: unknown): value is TeamRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.date === 'string' &&
    (record.createdAt === undefined || Number.isFinite(record.createdAt)) &&
    isTeam(record.teamA) &&
    isTeam(record.teamB)
  );
}

/**
 * localStorage에서 읽은 기록을 되살린다.
 * 배열이 아니면 null, 일부 항목만 깨졌으면 성한 것만 남긴다. id가 겹치면 앞의 것만 쓴다.
 */
export function parseStoredRecords(value: unknown): TeamRecord[] | null {
  if (!Array.isArray(value)) return null;

  const ids = new Set<string>();
  return value
    .filter(isRecord)
    .filter(record => {
      if (ids.has(record.id)) return false;
      ids.add(record.id);
      return true;
    })
    .slice(0, MAX_RECORDS);
}
