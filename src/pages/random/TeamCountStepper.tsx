import { Minus, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface TeamCountStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
}

const TeamCountStepper = ({ value, min, max, onChange }: TeamCountStepperProps) => (
  <div className="flex items-center justify-between">
    <span id="team-count-label" className="font-bold">
      팀 개수
    </span>
    <div className="flex items-center gap-3" role="group" aria-labelledby="team-count-label">
      <Button
        variant="outline"
        size="icon"
        aria-label="팀 개수 줄이기"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-8 text-center text-lg font-bold" aria-live="polite">
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="팀 개수 늘리기"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

export default TeamCountStepper;
