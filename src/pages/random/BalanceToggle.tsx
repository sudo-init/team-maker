import { cn } from '../../lib/utils';

interface BalanceToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  /** 점수를 입력하지 않은 사람 수. */
  unscored: number;
}

const BalanceToggle = ({ enabled, onChange, unscored }: BalanceToggleProps) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between gap-4">
      <span id="balance-label" className="font-bold">
        실력 균형 맞추기
      </span>
      {/* 체크박스 가상 요소는 브라우저마다 그려지지 않을 수 있어 버튼으로 스위치를 만든다. */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-labelledby="balance-label"
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          enabled ? 'bg-primary' : 'bg-input'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-background shadow transition-transform',
            enabled ? 'translate-x-[18px]' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
    <p className="text-sm text-muted-foreground">
      {!enabled
        ? '켜면 참가자마다 점수(티어, 실력 등)를 매겨 팀 전력을 맞출 수 있어요.'
        : unscored > 0
          ? `참가자 이름 옆 칸에 점수를 적어주세요. 점수가 없는 ${unscored}명은 평균 점수로 계산해요.`
          : '팀별 평균 점수가 최대한 비슷해지도록 나눠요.'}
    </p>
  </div>
);

export default BalanceToggle;
