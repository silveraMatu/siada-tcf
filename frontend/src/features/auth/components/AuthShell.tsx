import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Pantalla completa centrada, con la marca, para las vistas de autenticación. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <Link to="/" className="mb-8 flex items-center gap-3">
        <span className="text-sm font-semibold tracking-tight text-slate-900">
          HTC Formosa
        </span>
        <span className="h-4 w-px bg-slate-300" aria-hidden />
        <span className="text-sm font-semibold tracking-tight text-blue-600">
          SIADA
        </span>
      </Link>
      {children}
    </main>
  );
}
