import type { PositionMatch } from './positions';

/**
 * 숫자를 보기 좋게. 소수 둘째 자리까지 반올림하고 끝의 0은 뗀다.
 * 한 자리로 자르면 평균 5.68과 5.64가 둘 다 5.7·5.6으로 보이면서 차이는 "0"으로 나와 어긋난다.
 */
export function formatScore(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/**
 * 랜덤 팀 결과를 메신저에 붙여넣기 좋은 글로 만든다.
 * averages를 넘기면 팀마다 평균 점수를 함께 적는다.
 */
export function formatTeamsText(teams: string[][], averages?: number[]): string {
  const lines = teams.map((team, index) => {
    const average = averages ? ` · 평균 ${formatScore(averages[index])}` : '';
    return `${index + 1}팀 (${team.length}명${average}): ${team.join(', ')}`;
  });
  return ['[팀 나누기 결과]', ...lines].join('\n');
}

/** 포지션별 결과를 한 줄에 한 포지션씩 'A팀 선수 vs B팀 선수'로 적는다. */
export function formatMatchText(match: PositionMatch): string {
  const lines = match.teamA.map(
    (player, index) => `${player.position}: ${player.name} vs ${match.teamB[index]?.name ?? '-'}`
  );
  return ['[포지션별 팀 나누기]', 'A팀 vs B팀', ...lines].join('\n');
}
