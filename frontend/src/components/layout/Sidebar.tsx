import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { navigation } from './navigation';

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
          S
        </div>
        <span className="text-sm font-semibold tracking-tight">SIADA</span>
      </div>
      <nav className="flex flex-col gap-0.5 px-3 py-2">
        <p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
          Auditoría
        </p>
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
              )
            }
          >
            <Icon className="size-4" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-background md:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}
