import { EMPTY_CONSTRAINTS, type Constraints } from './constraints';

export type SplitResult =
  | { ok: true; teams: string[][] }
  | { ok: false; reason: string };

// 조건이 서로 얽히면 탐색이 길어질 수 있어 안전장치를 둔다.
// 사람이 수십 명 수준이면 실제로는 수백 단계 안에서 끝난다.
const SEARCH_STEP_LIMIT = 200_000;

/** Fisher-Yates 셔플. 원본 배열은 그대로 두고 섞인 새 배열을 돌려준다. */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 입력창에 적힌 문자열에서 이름 목록을 뽑아낸다.
 * 쉼표와 줄바꿈을 구분자로 보므로 "가나, 다라" 처럼 한 번에 여러 명을 붙여넣어도 된다.
 * 이름 안의 공백은 살려두기 위해 공백은 구분자로 쓰지 않는다.
 */
export function parseNames(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map(name => name.trim())
    .filter(Boolean);
}

/**
 * 이름을 랜덤으로 섞어 teamCount개의 팀으로 나눈다.
 *
 * 조건(같은 팀 / 다른 팀 / 팀 고정)을 모두 지키면서 팀 간 인원 차이는 최대 1명이 되게 한다.
 * '같은 팀' 조건으로 이어진 사람들을 하나의 묶음으로 합친 뒤, 묶음을 팀에 넣어보며
 * 막히면 되돌아가는 방식(백트래킹)이다. 후보 팀을 매번 섞기 때문에 같은 조건이라도
 * 돌릴 때마다 다른 결과가 나온다.
 *
 * 조건이 서로 모순이면 팀을 만들지 않고 이유를 돌려준다.
 */
export function splitIntoTeams(
  names: string[],
  teamCount: number,
  constraints: Constraints = EMPTY_CONSTRAINTS
): SplitResult {
  if (teamCount < 2) {
    return { ok: false, reason: '팀은 2개 이상이어야 해요.' };
  }
  if (names.length < teamCount) {
    return { ok: false, reason: `${teamCount}팀으로 나누려면 최소 ${teamCount}명이 필요해요.` };
  }

  const roster = new Set(names);

  // 1. '같은 팀' 조건으로 이어진 사람들을 하나로 합친다 (union-find).
  const parent = new Map(names.map(name => [name, name]));

  const find = (name: string): string => {
    let root = name;
    while (parent.get(root) !== root) {
      root = parent.get(root)!;
    }
    // 경로 압축.
    let cursor = name;
    while (parent.get(cursor) !== root) {
      const next = parent.get(cursor)!;
      parent.set(cursor, root);
      cursor = next;
    }
    return root;
  };

  for (const pair of constraints.pairs) {
    if (pair.kind !== 'together') continue;
    if (pair.a === pair.b || !roster.has(pair.a) || !roster.has(pair.b)) continue;
    parent.set(find(pair.a), find(pair.b));
  }

  // 2. 합쳐진 결과를 묶음 목록으로 정리한다. 혼자인 사람도 1명짜리 묶음이 된다.
  const groupIndexByRoot = new Map<string, number>();
  const groups: string[][] = [];

  for (const name of names) {
    const root = find(name);
    let index = groupIndexByRoot.get(root);
    if (index === undefined) {
      index = groups.length;
      groupIndexByRoot.set(root, index);
      groups.push([]);
    }
    groups[index].push(name);
  }

  const groupOf = (name: string) => groupIndexByRoot.get(find(name))!;

  // 3. '다른 팀' 조건을 묶음 사이의 관계로 바꾼다.
  const conflicts = groups.map(() => new Set<number>());

  for (const pair of constraints.pairs) {
    if (pair.kind !== 'apart') continue;
    if (pair.a === pair.b || !roster.has(pair.a) || !roster.has(pair.b)) continue;

    const groupA = groupOf(pair.a);
    const groupB = groupOf(pair.b);
    if (groupA === groupB) {
      return {
        ok: false,
        reason: `${pair.a}와(과) ${pair.b}는 '같은 팀' 조건으로 이어져 있어서 다른 팀에 둘 수 없어요.`
      };
    }
    conflicts[groupA].add(groupB);
    conflicts[groupB].add(groupA);
  }

  // 4. 고정 팀을 묶음 단위로 옮긴다. 한 묶음이 서로 다른 팀에 고정되면 모순이다.
  const fixedTeam: (number | null)[] = groups.map(() => null);

  for (const pin of constraints.pins) {
    if (!roster.has(pin.name)) continue;
    if (pin.teamIndex < 0 || pin.teamIndex >= teamCount) {
      return {
        ok: false,
        reason: `${pin.name}의 고정 팀(${pin.teamIndex + 1}팀)이 현재 팀 개수(${teamCount}팀)를 벗어났어요.`
      };
    }

    const group = groupOf(pin.name);
    const current = fixedTeam[group];
    if (current !== null && current !== pin.teamIndex) {
      return {
        ok: false,
        reason: `${groups[group].join(', ')}는 '같은 팀' 조건으로 묶였는데 서로 다른 팀(${current + 1}팀, ${pin.teamIndex + 1}팀)에 고정돼 있어요.`
      };
    }
    fixedTeam[group] = pin.teamIndex;
  }

  // 고정끼리 부딪히는 경우는 탐색 전에 걸러야 이유를 제대로 알려줄 수 있다.
  for (let group = 0; group < groups.length; group++) {
    for (const other of conflicts[group]) {
      if (fixedTeam[group] !== null && fixedTeam[group] === fixedTeam[other]) {
        return {
          ok: false,
          reason: `${groups[group].join(', ')}와(과) ${groups[other].join(', ')}는 '다른 팀' 조건인데 둘 다 ${fixedTeam[group]! + 1}팀에 고정돼 있어요.`
        };
      }
    }
  }

  // 5. 팀 정원. 인원이 딱 나누어떨어지지 않으면 나머지 수만큼의 팀만 한 명을 더 받는다.
  const baseSize = Math.floor(names.length / teamCount);
  const extraSlots = names.length % teamCount;
  const maxSize = baseSize + (extraSlots > 0 ? 1 : 0);

  const oversized = groups.find(group => group.length > maxSize);
  if (oversized) {
    return {
      ok: false,
      reason: `'같은 팀'으로 묶인 ${oversized.join(', ')} ${oversized.length}명이 한 팀 정원(${maxSize}명)을 넘어요.`
    };
  }

  // 6. 배치 순서: 고정된 묶음과 큰 묶음을 먼저 놓아야 막다른 길을 빨리 알아챈다.
  //    같은 조건끼리는 미리 섞어둔 순서가 유지된다(정렬이 안정적이라).
  const order = shuffle(groups.map((_, index) => index)).sort((x, y) => {
    const fixedFirst = Number(fixedTeam[y] !== null) - Number(fixedTeam[x] !== null);
    if (fixedFirst !== 0) return fixedFirst;
    return groups[y].length - groups[x].length;
  });

  // 7. 묶음을 하나씩 팀에 넣어보고, 막히면 되돌아간다.
  const placedGroups: number[][] = Array.from({ length: teamCount }, () => []);
  const sizes = new Array<number>(teamCount).fill(0);
  const usesExtraSlot = new Array<boolean>(teamCount).fill(false);
  const teamIndexes = Array.from({ length: teamCount }, (_, index) => index);
  let extraSlotsUsed = 0;
  let steps = 0;

  const canPlace = (group: number, team: number) => {
    const nextSize = sizes[team] + groups[group].length;
    if (nextSize > baseSize) {
      // 정원을 한 명 넘기려면 남은 여유 자리를 써야 한다.
      if (nextSize > baseSize + 1) return false;
      if (!usesExtraSlot[team] && extraSlotsUsed >= extraSlots) return false;
    }
    return !placedGroups[team].some(placed => conflicts[group].has(placed));
  };

  const search = (step: number): boolean => {
    if (step === order.length) return true;
    if (++steps > SEARCH_STEP_LIMIT) return false;

    const group = order[step];
    const fixed = fixedTeam[group];
    const candidates = fixed !== null ? [fixed] : shuffle(teamIndexes);

    for (const team of candidates) {
      if (!canPlace(group, team)) continue;

      const nextSize = sizes[team] + groups[group].length;
      const takesExtraSlot = nextSize > baseSize && !usesExtraSlot[team];
      if (takesExtraSlot) {
        usesExtraSlot[team] = true;
        extraSlotsUsed += 1;
      }
      sizes[team] = nextSize;
      placedGroups[team].push(group);

      if (search(step + 1)) return true;

      placedGroups[team].pop();
      sizes[team] -= groups[group].length;
      if (takesExtraSlot) {
        usesExtraSlot[team] = false;
        extraSlotsUsed -= 1;
      }
    }

    return false;
  };

  if (!search(0)) {
    return {
      ok: false,
      reason: '조건을 모두 만족하는 팀 구성을 찾지 못했어요. 조건을 줄이거나 팀 개수를 늘려보세요.'
    };
  }

  // 묶음끼리 뭉쳐 보이지 않도록 팀 안에서 한 번 더 섞는다.
  return {
    ok: true,
    teams: placedGroups.map(indexes => shuffle(indexes.flatMap(index => groups[index])))
  };
}
