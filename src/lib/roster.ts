import {
  EMPTY_CONSTRAINTS,
  parseStoredConstraints,
  pruneConstraints,
  type Constraints
} from './constraints';
import { MAX_SCORE, MIN_SCORE, type Scores } from './balance';
import { parseStoredNames, readStored, writeStored } from './storage';

/**
 * 랜덤 팀 짜기의 입력 전체: 참가자, 팀 수, 조건, 실력 점수와 균형 모드.
 *
 * 값들은 서로 묶여 있다. 사람이 빠지면 그 사람이 낀 조건과 점수가, 팀이 줄면 사라진 팀에 건
 * 고정이 무의미해진다. 그래서 따로따로 고치지 않고 이 모듈의 함수로만 바꾸며,
 * 모든 함수는 normalizeRoster를 거친 일관된 상태를 돌려준다.
 */
export interface Roster {
  names: string[];
  teamCount: number;
  rules: Constraints;
  /** 이름별 실력 점수. 명단에 없는 사람의 점수는 남기지 않는다. */
  scores: Scores;
  /** 켜면 점수 평균이 비슷하도록 나눈다. */
  balance: boolean;
}

export const MIN_TEAM_COUNT = 2;

export const EMPTY_ROSTER: Roster = {
  names: [],
  teamCount: MIN_TEAM_COUNT,
  rules: EMPTY_CONSTRAINTS,
  scores: {},
  balance: false
};

/** 팀보다 사람이 적으면 빈 팀이 생기므로 인원 수가 팀 수의 상한이다. */
export function maxTeamCount(names: string[]): number {
  return Math.max(MIN_TEAM_COUNT, names.length);
}

/** 팀 수를 허용 범위로 맞추고, 지금 명단과 팀 수에 맞지 않는 조건·점수를 걸러낸다. */
export function normalizeRoster(roster: Roster): Roster {
  const teamCount = Math.min(
    maxTeamCount(roster.names),
    Math.max(MIN_TEAM_COUNT, Math.floor(roster.teamCount))
  );
  return {
    ...roster,
    teamCount,
    rules: pruneConstraints(roster.rules, roster.names, teamCount),
    scores: pickScores(roster.scores, roster.names)
  };
}

function pickScores(scores: Scores, names: string[]): Scores {
  return Object.fromEntries(
    names.filter(name => scores[name] !== undefined).map(name => [name, scores[name]])
  );
}

/** 이름을 추가한다. 같은 이름이 두 번 들어가면 결과에서 누가 누군지 구분할 수 없으므로 건너뛴다. */
export function addNames(
  roster: Roster,
  candidates: string[]
): { roster: Roster; duplicated: string[] } {
  const names = [...roster.names];
  const duplicated: string[] = [];

  for (const name of candidates) {
    if (names.includes(name)) {
      duplicated.push(name);
    } else {
      names.push(name);
    }
  }

  if (names.length === roster.names.length) return { roster, duplicated };
  return { roster: normalizeRoster({ ...roster, names }), duplicated };
}

export function removeName(roster: Roster, target: string): Roster {
  return normalizeRoster({ ...roster, names: roster.names.filter(name => name !== target) });
}

export function clearNames(roster: Roster): Roster {
  return normalizeRoster({ ...roster, names: [] });
}

/**
 * 팀 수를 바꾼다. 범위를 벗어나면 가장 가까운 값으로 맞춘다.
 * droppedPins는 없어진 팀에 걸려 있어서 함께 지워진 고정 조건 수다.
 */
export function setTeamCount(
  roster: Roster,
  teamCount: number
): { roster: Roster; droppedPins: number } {
  const next = normalizeRoster({ ...roster, teamCount });
  if (next.teamCount === roster.teamCount) return { roster, droppedPins: 0 };
  return { roster: next, droppedPins: roster.rules.pins.length - next.rules.pins.length };
}

export function setRules(roster: Roster, rules: Constraints): Roster {
  return normalizeRoster({ ...roster, rules });
}

/** 점수를 매기거나(숫자) 지운다(null). 값이 그대로면 같은 객체를 돌려준다. */
export function setScore(roster: Roster, name: string, score: number | null): Roster {
  if (!roster.names.includes(name) || (roster.scores[name] ?? null) === score) return roster;
  const scores = { ...roster.scores };
  if (score === null) {
    delete scores[name];
  } else {
    scores[name] = score;
  }
  return { ...roster, scores };
}

export function setBalance(roster: Roster, balance: boolean): Roster {
  return roster.balance === balance ? roster : { ...roster, balance };
}

// 예전 버전과 같은 키를 그대로 써서 기존 사용자의 명단을 잃지 않는다.
const NAMES_KEY = 'randomTeamNames';
const RULES_KEY = 'randomTeamConstraints';
const TEAM_COUNT_KEY = 'randomTeamCount';
const SCORES_KEY = 'randomTeamScores';
const BALANCE_KEY = 'randomTeamBalance';

function parseStoredTeamCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_TEAM_COUNT
    ? value
    : null;
}

function parseStoredScores(value: unknown): Scores | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && entry[1] >= MIN_SCORE && entry[1] <= MAX_SCORE
    )
  );
}

const parseStoredBoolean = (value: unknown) => (typeof value === 'boolean' ? value : null);

/** 저장된 명단을 불러온다. 일부가 깨져 있으면 그 부분만 기본값으로 채운다. */
export function loadRoster(): Roster {
  return normalizeRoster({
    names: readStored(NAMES_KEY, parseStoredNames) ?? EMPTY_ROSTER.names,
    teamCount: readStored(TEAM_COUNT_KEY, parseStoredTeamCount) ?? EMPTY_ROSTER.teamCount,
    rules: readStored(RULES_KEY, parseStoredConstraints) ?? EMPTY_ROSTER.rules,
    scores: readStored(SCORES_KEY, parseStoredScores) ?? EMPTY_ROSTER.scores,
    balance: readStored(BALANCE_KEY, parseStoredBoolean) ?? EMPTY_ROSTER.balance
  });
}

export function saveRoster(roster: Roster): void {
  writeStored(NAMES_KEY, roster.names);
  writeStored(TEAM_COUNT_KEY, roster.teamCount);
  writeStored(RULES_KEY, roster.rules);
  writeStored(SCORES_KEY, roster.scores);
  writeStored(BALANCE_KEY, roster.balance);
}
