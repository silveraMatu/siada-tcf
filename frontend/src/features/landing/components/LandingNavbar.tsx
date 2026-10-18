import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            HTC Formosa
          </span>
          <span className="h-4 w-px bg-slate-300" aria-hidden />
          <span className="text-sm font-semibold tracking-tight text-blue-600">
            SIADA
          </span>
          <span className="hidden text-xs text-slate-500 md:inline">
            Sistema Integral de Auditoría
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/registro">Registrarse</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Link to="/login">Iniciar Sesión</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
