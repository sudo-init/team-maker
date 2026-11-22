import { EMPTY_CONSTRAINTS, type Constraints } from './constraints';
import { splitIntoTeams, type SplitResult } from './team';

/** 이름별 실력 점수. 없는 사람은 점수를 입력하지 않은 것이다. */
export type Scores = Record<string, number>;

export const MIN_SCORE = 0;
export const MAX_SCORE = 9999;

/** 입력칸 문자열을 점수로 바꾼다. 비었거나 범위를 벗어나면 null(점수 없음). */
export function parseScore(input: string): number | null {
  if (input.trim() === '') return null;
  const value = Number(input);
  if (!Number.isFinite(value) || value < MIN_SCORE || value > MAX_SCORE) return null;
  return value;
}

/**
 * 점수를 매기지 않은 사람은 입력된 점수의 평균으로 친다.
 * 0으로 치면 미입력자가 몰린 팀이 약하다고 계산돼 오히려 한쪽으로 쏠린다.
 */
export function resolveScores(names: string[], scores: Scores): (name: string) => number {
  const given = names.map(name => scores[name]).filter(score => score !== undefined);
  const fallback = given.length > 0 ? given.reduce((sum, score) => sum + score, 0) / given.length : 0;
  return name => scores[name] ?? fallback;
}

/** 팀별 평균 점수. 인원이 다른 팀끼리도 비교할 수 있게 합계가 아니라 평균을 쓴다. */
export function teamAverages(teams: string[][], scoreOf: (name: string) => number): number[] {
  return teams.map(team =>
    team.length === 0 ? 0 : team.reduce((sum, name) => sum + scoreOf(name), 0) / team.length
  );
}

/** 가장 센 팀과 가장 약한 팀의 평균 차이. 0이면 완벽한 균형이다. */
export function scoreSpread(teams: string[][], scoreOf: (name: string) => number): number {
  const averages = teamAverages(teams, scoreOf);
  return Math.max(...averages) - Math.min(...averages);
}

const EPSILON = 1e-9;

export interface BalanceOptions {
  /** 무작위로 뽑아볼 후보 편성 수. 많을수록 균형은 좋아지고 느려진다. */
  attempts?: number;
}

/**
 * 조건을 지키면서 팀별 평균 점수가 비슷하도록 나눈다.
 *
 * 1. splitIntoTeams로 조건을 만족하는 편성을 여러 개 뽑아 가장 고른 것을 고른다.
 * 2. 거기서 두 사람을 맞바꿔 차이가 줄어들면 바꾸기를 더 나아지지 않을 때까지 반복한다.
 *    맞바꾸면 팀 인원은 그대로이므로 인원 균형은 깨지지 않는다.
 *
 * 매번 무작위 편성에서 출발하므로, 균형이 같은 편성이 여럿이면 돌릴 때마다 결과가 다르다.
 */
export function balanceTeams(
  names: string[],
  teamCount: number,
  constraints: Constraints = EMPTY_CONSTRAINTS,
  scores: Scores = {},
  { attempts = 60 }: BalanceOptions = {}
): SplitResult {
  const first = splitIntoTeams(names, teamCount, constraints);
  if (!first.ok) return first;

  const scoreOf = resolveScores(names, scores);
  let best = first.teams;
  let bestSpread = scoreSpread(best, scoreOf);

  for (let attempt = 1; attempt < attempts && bestSpread > EPSILON; attempt++) {
    const candidate = splitIntoTeams(names, teamCount, constraints);
    // 탐색 한도에 걸린 시도는 건너뛴다. 이미 성공한 편성이 하나는 있다.
    if (!candidate.ok) continue;
    const spread = scoreSpread(candidate.teams, scoreOf);
    if (spread < bestSpread - EPSILON) {
      best = candidate.teams;
      bestSpread = spread;
    }
  }

  return { ok: true, teams: improveBySwaps(best, constraints, scoreOf) };
}

/** 두 사람을 맞바꿔 팀 간 차이를 줄인다. 조건이 걸린 사람은 건드리지 않거나 조건을 지키는 선에서만 옮긴다. */
function improveBySwaps(
  initial: string[][],
  constraints: Constraints,
  scoreOf: (name: string) => number
): string[][] {
  const teams = initial.map(team => [...team]);
  const inRoster = new Set(teams.flat());

  // '같은 팀'으로 묶였거나 팀에 고정된 사람은 혼자 옮기면 조건이 깨진다.
  const locked = new Set<string>();
  const apart = new Map<string, Set<string>>();
  for (const pair of constraints.pairs) {
    if (pair.a === pair.b || !inRoster.has(pair.a) || !inRoster.has(pair.b)) continue;
    if (pair.kind === 'together') {
      locked.add(pair.a);
      locked.add(pair.b);
    } else {
      if (!apart.has(pair.a)) apart.set(pair.a, new Set());
      if (!apart.has(pair.b)) apart.set(pair.b, new Set());
      apart.get(pair.a)!.add(pair.b);
      apart.get(pair.b)!.add(pair.a);
    }
  }
  for (const pin of constraints.pins) locked.add(pin.name);

  /** name이 team으로 옮겨가도 되는지. leaving은 그 팀에서 빠질 사람이다. */
  const canJoin = (name: string, team: string[], leaving: string) => {
    const enemies = apart.get(name);
    return !enemies || !team.some(member => member !== leaving && enemies.has(member));
  };

  const sums = teams.map(team => team.reduce((sum, name) => sum + scoreOf(name), 0));
  const spreadWith = (nextSums: number[]) => {
    const averages = nextSums.map((sum, index) => sum / teams[index].length);
    return Math.max(...averages) - Math.min(...averages);
  };

  // 사람 수가 많아도 몇십 번 안에 수렴한다. 혹시 모를 무한 반복을 막는 상한이다.
  for (let round = 0; round < 500; round++) {
    let current = spreadWith(sums);
    if (current <= EPSILON) break;

    let bestSwap: { i: number; x: number; j: number; y: number } | null = null;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        for (let x = 0; x < teams[i].length; x++) {
          const a = teams[i][x];
          if (locked.has(a)) continue;
          for (let y = 0; y < teams[j].length; y++) {
            const b = teams[j][y];
            if (locked.has(b)) continue;
            const delta = scoreOf(b) - scoreOf(a);
            if (Math.abs(delta) <= EPSILON) continue;
            if (!canJoin(a, teams[j], b) || !canJoin(b, teams[i], a)) continue;

            const nextSums = [...sums];
            nextSums[i] += delta;
            nextSums[j] -= delta;
            const spread = spreadWith(nextSums);
            if (spread < current - EPSILON) {
              current = spread;
              bestSwap = { i, x, j, y };
            }
          }
        }
      }
    }

    if (!bestSwap) break;
    const { i, x, j, y } = bestSwap;
    const a = teams[i][x];
    const b = teams[j][y];
    teams[i][x] = b;
    teams[j][y] = a;
    sums[i] += scoreOf(b) - scoreOf(a);
    sums[j] += scoreOf(a) - scoreOf(b);
  }

  return teams;
}
