const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/**
 * 받침 유무로 갈리는 조사 쌍과, 각각 [받침 있을 때, 받침 없을 때] 형태.
 * 지원하는 쌍만 받는다. "으로/로"처럼 ㄹ 받침 예외가 있는 조사는 규칙이 달라 넣지 않았다.
 */
const JOSA_FORMS = {
  '와/과': ['과', '와'],
  '은/는': ['은', '는'],
  '을/를': ['을', '를'],
  '이/가': ['이', '가']
} as const;

export type JosaPair = keyof typeof JOSA_FORMS;

/**
 * 단어 끝 받침에 맞는 조사를 고른다. 예: josa('민준', '와/과') → '과'
 * 한글로 끝나지 않아 판단할 수 없으면 "와(과)"처럼 둘 다 보여준다.
 */
export function josa(word: string, pair: JosaPair): string {
  const [withFinal, withoutFinal] = JOSA_FORMS[pair];
  const trimmed = word.trim();
  const code = trimmed.codePointAt(trimmed.length - 1) ?? 0;
  if (code < HANGUL_START || code > HANGUL_END) {
    const [first, second] = pair.split('/');
    return `${first}(${second})`;
  }
  const hasFinal = (code - HANGUL_START) % 28 !== 0;
  return hasFinal ? withFinal : withoutFinal;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 지난 시각을 "방금 전", "3분 전"처럼 말한다. 일주일이 넘었거나 미래면 빈 문자열을 돌려준다. */
export function relativeTime(then: number, now: number): string {
  const elapsed = now - then;
  if (elapsed < 0 || elapsed >= 7 * DAY) return '';
  if (elapsed < MINUTE) return '방금 전';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분 전`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간 전`;
  return `${Math.floor(elapsed / DAY)}일 전`;
}

/** "8명, 2팀"을 "4명씩 2팀", "10명, 3팀"을 "3~4명씩 3팀"처럼 읽기 쉽게 바꾼다. */
export function teamSizeSummary(people: number, teams: number): string {
  if (teams <= 0 || people < teams) return '';
  const base = Math.floor(people / teams);
  const size = people % teams === 0 ? `${base}` : `${base}~${base + 1}`;
  return `${size}명씩 ${teams}팀`;
}
