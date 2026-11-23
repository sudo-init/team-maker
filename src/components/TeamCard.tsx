import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

// 팀마다 순서대로 입히는 색. 팀이 많아지면 처음부터 다시 돌려 쓴다.
// 색만으로 팀을 구분하지 않도록 카드에는 항상 팀 이름(번호)을 함께 보여준다.
const TEAM_STYLES = [
  { stripe: 'bg-blue-500', badge: 'bg-blue-500 text-white', tag: 'text-blue-700 dark:text-blue-300' },
  { stripe: 'bg-rose-500', badge: 'bg-rose-500 text-white', tag: 'text-rose-700 dark:text-rose-300' },
  { stripe: 'bg-emerald-500', badge: 'bg-emerald-600 text-white', tag: 'text-emerald-700 dark:text-emerald-300' },
  { stripe: 'bg-amber-400', badge: 'bg-amber-400 text-amber-950', tag: 'text-amber-700 dark:text-amber-300' },
  { stripe: 'bg-violet-500', badge: 'bg-violet-500 text-white', tag: 'text-violet-700 dark:text-violet-300' },
  { stripe: 'bg-teal-500', badge: 'bg-teal-600 text-white', tag: 'text-teal-700 dark:text-teal-300' }
];

export interface TeamMember {
  /** 팀 안에서 겹치지 않는 값. */
  key: string;
  name: string;
  /** 이름 왼쪽에 붙는 보조 정보(예: 포지션). */
  tag?: string;
  /** 이름 오른쪽에 흐리게 붙는 보조 정보(예: 점수). */
  detail?: string;
}

interface TeamCardProps {
  /** 몇 번째 팀인지. 색을 고르는 데 쓴다. */
  index: number;
  /** 배지에 크게 쓰는 짧은 표시. 예: "1", "A" */
  mark: string;
  /** 카드 제목. 예: "1팀" */
  title: string;
  /** 제목 아래 보조 정보. 예: "4명 · 평균 5.5" */
  meta?: string;
  members: TeamMember[];
  /** 기록 목록처럼 좁은 곳에서 쓰는 작은 모양. */
  compact?: boolean;
  /** 결과가 차례로 나타나게 할 때 이 카드가 기다릴 시간(ms). 없으면 애니메이션 없이 그린다. */
  revealDelay?: number;
}

const TeamCard = ({ index, mark, title, meta, members, compact = false, revealDelay }: TeamCardProps) => {
  const style = TEAM_STYLES[index % TEAM_STYLES.length];
  const Heading = compact ? 'h4' : 'h3';
  const animated = revealDelay !== undefined;
  const animationStyle: CSSProperties | undefined = animated
    ? { animationDelay: `${revealDelay}ms` }
    : undefined;

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card text-card-foreground',
        compact ? 'shadow-none' : 'shadow-sm',
        animated && 'animate-rise'
      )}
      style={animationStyle}
    >
      <div aria-hidden className={cn('h-1.5', style.stripe)} />
      <div className={cn('flex items-center gap-3', compact ? 'px-3 pt-2.5' : 'px-4 pt-4')}>
        <span
          aria-hidden
          className={cn(
            'grid shrink-0 place-items-center rounded-lg font-display font-extrabold leading-none',
            compact ? 'size-7 text-sm' : 'size-10 text-xl',
            style.badge
          )}
        >
          {mark}
        </span>
        <div className="min-w-0">
          <Heading className={cn('font-bold leading-tight', compact ? 'text-sm' : 'text-base')}>
            {title}
          </Heading>
          {meta && <p className="text-xs text-muted-foreground tabular-nums">{meta}</p>}
        </div>
      </div>
      <ul className={cn('divide-y', compact ? 'px-3 pb-1.5 pt-1.5 text-sm' : 'px-4 pb-2 pt-3')}>
        {members.map(member => (
          <li
            key={member.key}
            className={cn('flex items-center gap-3', compact ? 'py-1' : 'py-2.5')}
          >
            {member.tag && (
              <span className={cn('w-10 shrink-0 text-xs font-bold tracking-wide', style.tag)}>
                {member.tag}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate font-medium">{member.name}</span>
            {member.detail && (
              <span className="shrink-0 text-sm text-muted-foreground tabular-nums">{member.detail}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TeamCard;
