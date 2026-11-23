import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  /** 제목 오른쪽에 두는 보조 동작. */
  action?: ReactNode;
}

const PageHeader = ({ title, description, action }: PageHeaderProps) => (
  <div className="mb-8 flex items-start justify-between gap-4">
    <div className="space-y-1.5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="text-muted-foreground">{description}</p>
    </div>
    {action}
  </div>
);

export default PageHeader;
