import { UserPlus, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import type { Scores } from '../../lib/balance';
import ScoreInput from './ScoreInput';

interface ParticipantListProps {
  names: string[];
  onRemove: (name: string) => void;
  /** 비어 있을 때 예시 명단으로 채운다. */
  onFillExample: () => void;
  /** 넘기면 이름마다 점수 입력칸이 있는 줄 목록으로 보여준다. */
  scoring?: {
    scores: Scores;
    onChange: (name: string, score: number | null) => void;
  };
}

const RemoveButton = ({ name, onRemove }: { name: string; onRemove: () => void }) => (
  <button
    type="button"
    aria-label={`${name} 삭제`}
    onClick={onRemove}
    // 아이콘은 작아도 누르는 영역은 28px을 확보한다.
    className="-my-1 grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
  >
    <X className="size-3.5" />
  </button>
);

const ParticipantList = ({ names, onRemove, onFillExample, scoring }: ParticipantListProps) => {
  if (names.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
          <UserPlus className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="font-semibold">아직 참가자가 없어요</p>
          <p className="text-sm text-muted-foreground">위 칸에 이름을 넣거나, 예시로 먼저 둘러보세요.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onFillExample}>
          예시 명단 넣기
        </Button>
      </div>
    );
  }

  if (scoring) {
    return (
      <ul className="grid gap-2 sm:grid-cols-2">
        {names.map(name => (
          <li
            key={name}
            className="flex items-center gap-2 rounded-lg border bg-card py-1.5 pr-1.5 pl-3"
          >
            <span className="min-w-0 flex-1 truncate font-medium">{name}</span>
            <ScoreInput
              name={name}
              score={scoring.scores[name]}
              onChange={score => scoring.onChange(name, score)}
            />
            <RemoveButton name={name} onRemove={() => onRemove(name)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {names.map(name => (
        <li
          key={name}
          className="inline-flex items-center gap-1 rounded-full border bg-card py-1 pr-1 pl-3.5 text-sm font-medium shadow-xs"
        >
          {name}
          <RemoveButton name={name} onRemove={() => onRemove(name)} />
        </li>
      ))}
    </ul>
  );
};

export default ParticipantList;
