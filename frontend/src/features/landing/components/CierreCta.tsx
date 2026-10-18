import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

export function CierreCta() {
  return (
    <section className="border-t border-border bg-muted/40 text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-20 md:px-8 md:py-28">
        <h2 className="max-w-3xl font-prensa text-[clamp(2rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.025em] text-balance">
          El respaldo en cada rendición. La decisión, del delegado.
        </h2>
        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
          Ingrese con su cuenta para auditar las rendiciones de los organismos
          de la Provincia.
        </p>
        <Button
          asChild
          size="lg"
          className="mt-9 h-12 rounded-none px-8 text-base font-bold"
        >
          <Link to="/login">
            Iniciar sesión
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
