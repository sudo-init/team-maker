import type { ReactNode } from 'react';

/**
 * 화면의 주 동작을 담는 줄. 휴대폰에서는 입력이 길어져도 엄지 닿는 곳에 있도록 화면 아래에 고정하고,
 * 넓은 화면에서는 입력 바로 아래 제자리에 둔다. 고정됐을 때 가리는 만큼의 여백은 index.css가 준다.
 */
const ActionBar = ({ children }: { children: ReactNode }) => (
  <div
    data-action-bar
    className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/85 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
  >
    <div className="mx-auto max-w-3xl space-y-2">{children}</div>
  </div>
);

export default ActionBar;
