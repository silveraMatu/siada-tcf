import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CierreCta() {
  return (
    <section className="sobre-carpeta bg-carpeta text-foja">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
        <h2 className="max-w-3xl font-prensa text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.025em] text-balance">
          El respaldo en cada rendición. La decisión, del delegado.
        </h2>
        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-[#cfd3f2]">
          Ingrese con su cuenta para auditar las rendiciones de los organismos
          de la Provincia.
        </p>
        <Link
          to="/login"
          className="mt-9 inline-flex items-center justify-center gap-2 bg-foja px-8 py-4 text-base font-bold text-carpeta transition-colors hover:bg-white"
        >
          Iniciar sesión
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
