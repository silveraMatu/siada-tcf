import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ThemeToggle } from '@/components/theme/ThemeToggle';

/** Pantalla completa centrada, con la marca, para las vistas de autenticación. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12">
      <ThemeToggle className="absolute right-4 top-4" />
      <Link to="/" className="mb-8 flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          HTC Formosa
        </span>
        <span className="h-4 w-px bg-border" aria-hidden />
        <span className="text-sm font-semibold tracking-tight text-muted-foreground">
          SIADA
        </span>
      </Link>
      {children}
    </main>
  );
}
