import { Link } from 'react-router-dom';

export function LandingNavbar() {
  return (
    <header className="sobre-carpeta sticky top-0 z-40 border-b border-white/10 bg-carpeta text-foja">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-baseline gap-3">
          <span className="font-prensa text-base font-extrabold tracking-tight">
            SIADA
          </span>
          <span className="hidden text-sm text-[#cfd3f2] sm:inline">
            Tribunal de Cuentas · Formosa
          </span>
        </Link>
        <nav aria-label="Acceso" className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/registro"
            className="px-3 py-2 text-sm font-medium text-[#cfd3f2] transition-colors hover:text-foja"
          >
            Registrarse
          </Link>
          <Link
            to="/login"
            className="bg-foja px-4 py-2 text-sm font-bold text-carpeta transition-colors hover:bg-white"
          >
            Iniciar sesión
          </Link>
        </nav>
      </div>
    </header>
  );
}
