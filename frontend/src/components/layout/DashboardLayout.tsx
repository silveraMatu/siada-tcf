import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Sidebar, SidebarContent } from './Sidebar';

export function DashboardLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden">
          <span className="text-sm font-semibold tracking-tight">SIADA</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </header>
        {open && (
          <div className="border-b bg-background md:hidden">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
