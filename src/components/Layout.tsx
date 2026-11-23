import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
  { to: '/', label: '포지션별' },
  { to: '/random', label: '랜덤 팀' }
];

/** 작전판의 말 두 개를 겹친 로고. */
const LogoMark = () => (
  <span
    aria-hidden
    className="relative grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30"
  >
    <span className="absolute left-1.5 top-1.5 size-2.5 rounded-full bg-current" />
    <span className="absolute bottom-1.5 right-1.5 size-2.5 rounded-full border-2 border-current" />
  </span>
);

const Layout = () => {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4 sm:gap-3">
          <NavLink
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <LogoMark />
            {/* 휴대폰에서는 글자를 숨기고 로고만 남긴다. 화면낭독기는 계속 읽는다. */}
            <span className="sr-only font-display text-lg font-extrabold tracking-tight whitespace-nowrap sm:not-sr-only">
              Team Maker
            </span>
          </NavLink>

          <nav aria-label="화면 전환" className="ml-auto">
            <ul className="flex rounded-lg bg-muted p-1">
              {NAV_ITEMS.map(item => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    // 인덱스 경로는 end를 붙여야 하위 경로에서도 활성으로 잡히지 않는다.
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'block rounded-md px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap sm:px-3 transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                        isActive
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-12">
        <Outlet />
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-3xl px-4 py-6 text-xs text-muted-foreground">
          입력한 명단과 설정은 이 브라우저에만 저장돼요. 서버로 보내지 않아요.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
