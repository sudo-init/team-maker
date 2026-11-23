import { cn } from '../../lib/utils';

interface BalanceToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  /** 점수를 입력하지 않은 사람 수. */
  unscored: number;
}

const BalanceToggle = ({ enabled, onChange, unscored }: BalanceToggleProps) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <p id="balance-label" className="font-semibold">
        실력 균형 맞추기
      </p>
      <p id="balance-hint" className="text-sm text-muted-foreground">
        {!enabled
          ? '켜면 참가자마다 점수(티어, 실력 등)를 매겨 팀 전력을 맞춰요.'
          : unscored > 0
            ? `위 명단에 점수를 적어주세요. 비워둔 ${unscored}명은 평균 점수로 계산해요.`
            : '팀별 평균 점수가 최대한 비슷해지도록 나눠요.'}
      </p>
    </div>
    {/* 체크박스 가상 요소는 브라우저마다 그려지지 않을 수 있어 버튼으로 스위치를 만든다. */}
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-labelledby="balance-label"
      aria-describedby="balance-hint"
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        enabled ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'inline-block size-5.5 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-[1.375rem]' : 'translate-x-1'
        )}
      />
    </button>
  </div>
);

export default BalanceToggle;
