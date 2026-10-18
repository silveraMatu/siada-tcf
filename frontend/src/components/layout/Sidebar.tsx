import { LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { ROL_LABEL } from '@/features/usuarios/types';
import { cn } from '@/lib/utils';
import { filtrarNavegacion, navigationGroups } from './navigation';

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const grupos = filtrarNavegacion(navigationGroups, user?.roles);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
          S
        </div>
        <span className="text-sm font-semibold tracking-tight">SIADA</span>
      </div>
      <nav
        aria-label="Navegación principal"
        className="flex flex-col gap-6 px-3 py-2"
      >
        {grupos.map(({ label: grupo, items }) => (
          <div key={grupo} className="flex flex-col gap-0.5">
            <p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
              {grupo}
            </p>
            {items.map(({ to, label, icon: Icon }) => (
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
          </div>
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t px-4 py-4">
        {user && (
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium" title={user.email}>
              {user.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.roles.map((rol) => ROL_LABEL[rol]).join(' · ')}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 px-2 text-muted-foreground"
          onClick={logout}
        >
          <LogOut />
          Cerrar Sesión
        </Button>
      </div>
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
