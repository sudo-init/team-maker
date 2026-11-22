import { useState } from 'react';
import { MAX_SCORE, MIN_SCORE, parseScore } from '../../lib/balance';
import { cn } from '../../lib/utils';

interface ScoreInputProps {
  name: string;
  score: number | undefined;
  onChange: (score: number | null) => void;
}

/**
 * 참가자 한 명의 실력 점수 입력칸.
 * "3." 처럼 입력 도중의 글자를 지우지 않도록 화면에는 입력한 글자를 그대로 두고,
 * 숫자로 읽히는 순간에만 점수를 바꾼다.
 */
const ScoreInput = ({ name, score, onChange }: ScoreInputProps) => {
  const [draft, setDraft] = useState(score === undefined ? '' : String(score));
  const invalid = draft.trim() !== '' && parseScore(draft) === null;

  return (
    <input
      type="number"
      inputMode="decimal"
      min={MIN_SCORE}
      max={MAX_SCORE}
      step="any"
      placeholder="점수"
      aria-label={`${name} 점수`}
      aria-invalid={invalid || undefined}
      value={draft}
      onChange={e => {
        setDraft(e.target.value);
        onChange(parseScore(e.target.value));
      }}
      className={cn(
        'h-6 w-14 rounded border border-input bg-background px-1 text-center text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        invalid && 'border-destructive'
      )}
    />
  );
};

export default ScoreInput;
