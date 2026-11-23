import { Minus, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { teamSizeSummary } from '../../lib/text';

interface TeamCountStepperProps {
  value: number;
  min: number;
  max: number;
  /** 지금 참가자 수. "4명씩 2팀" 같은 요약에 쓴다. */
  people: number;
  onChange: (next: number) => void;
}

const TeamCountStepper = ({ value, min, max, people, onChange }: TeamCountStepperProps) => {
  const summary = teamSizeSummary(people, value);

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p id="team-count-label" className="font-semibold">
          팀 개수
        </p>
        <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {summary || `${value}팀이면 최소 ${value}명이 필요해요`}
        </p>
      </div>
      <div className="flex items-center gap-1 rounded-xl border bg-card p-1" role="group" aria-labelledby="team-count-label">
        <Button
          variant="ghost"
          size="icon"
          aria-label="팀 개수 줄이기"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
        >
          <Minus />
        </Button>
        <output
          aria-labelledby="team-count-label"
          className="w-9 text-center font-display text-2xl font-extrabold tabular-nums"
        >
          {value}
        </output>
        <Button
          variant="ghost"
          size="icon"
          aria-label="팀 개수 늘리기"
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
};

export default TeamCountStepper;
