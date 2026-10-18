import { Link } from 'react-router-dom';

import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Button } from '@/components/ui/button';

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 text-foreground backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-baseline gap-3">
          <span className="font-prensa text-base font-extrabold tracking-tight">
            SIADA
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Tribunal de Cuentas · Formosa
          </span>
        </Link>
        <nav aria-label="Acceso" className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline" size="sm" className="rounded-none">
            <Link to="/registro">Registrarse</Link>
          </Button>
          <Button asChild size="sm" className="rounded-none font-bold">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
