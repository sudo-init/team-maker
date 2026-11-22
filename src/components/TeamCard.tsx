import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// 팀마다 순서대로 입히는 색. 팀이 많아지면 처음부터 다시 돌려 쓴다.
const TEAM_STYLES = [
  { title: 'text-blue-600', item: 'bg-blue-50' },
  { title: 'text-red-600', item: 'bg-red-50' },
  { title: 'text-green-600', item: 'bg-green-50' },
  { title: 'text-amber-600', item: 'bg-amber-50' },
  { title: 'text-purple-600', item: 'bg-purple-50' },
  { title: 'text-teal-600', item: 'bg-teal-50' }
];

export interface TeamMember {
  /** 팀 안에서 겹치지 않는 값. */
  key: string;
  name: string;
  /** 이름 왼쪽에 붙는 보조 정보(예: 포지션). */
  tag?: string;
}

interface TeamCardProps {
  /** 몇 번째 팀인지. 색을 고르는 데 쓴다. */
  index: number;
  title: ReactNode;
  members: TeamMember[];
  /** 기록 목록처럼 좁은 곳에서 쓰는 작은 모양. */
  compact?: boolean;
}

const TeamCard = ({ index, title, members, compact = false }: TeamCardProps) => {
  const style = TEAM_STYLES[index % TEAM_STYLES.length];
  const Heading = compact ? 'h4' : 'h3';

  return (
    <section className="space-y-2">
      <Heading className={cn('font-bold', compact ? 'text-base' : 'text-lg', style.title)}>
        {title}
      </Heading>
      <ul className="space-y-2">
        {members.map(member => (
          <li
            key={member.key}
            className={cn(
              'flex justify-between gap-2',
              compact ? 'text-sm' : cn('rounded p-2', style.item)
            )}
          >
            {member.tag && <span className="font-medium">{member.tag}</span>}
            <span>{member.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default TeamCard;
