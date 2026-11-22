import { NavLink, Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';

const NAV_ITEMS = [
  { to: '/', label: '포지션별 팀 나누기' },
  { to: '/random', label: '랜덤 팀 짜기' }
];

const Layout = () => {
  return (
    <div className="min-h-screen bg-muted/60">
      <header className="bg-card shadow dark:border-b">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Team Maker</h1>
            <ThemeToggle />
          </div>
          <nav className="mt-4 flex flex-wrap gap-2">
            {NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                // 인덱스 경로는 end를 붙여야 하위 경로에서도 활성으로 잡히지 않는다.
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
