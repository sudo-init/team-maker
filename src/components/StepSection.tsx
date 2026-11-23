import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StepSectionProps {
  /** 몇 번째 단계인지. 제목 앞 번호로 보인다. */
  step: number;
  title: ReactNode;
  /** 제목 줄 오른쪽에 두는 보조 정보나 동작. */
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/** 입력 화면을 번호 붙은 단계로 나눈다. 카드로 감싸지 않고 간격과 제목으로만 구분한다. */
const StepSection = ({ step, title, aside, children, className }: StepSectionProps) => {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn('space-y-4', className)}>
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 id={headingId} className="flex items-center gap-2.5 text-base font-bold">
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-full bg-foreground font-display text-xs font-bold text-background"
          >
            {step}
          </span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
};

export default StepSection;
