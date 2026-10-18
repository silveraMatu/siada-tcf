import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { Folio } from './Folio';
import { Ilustrativo } from './Ilustrativo';

const campos = [
  { campo: 'Organismo', valor: 'Organismo de ejemplo' },
  { campo: 'Período', valor: 'Marzo 2026' },
  { campo: 'Planilla', valor: 'libro-banco-marzo.xlsx' },
  { campo: 'Vista previa', valor: '4 movimientos listos para confirmar' },
];

export function SeccionOrganismos() {
  return (
    <section className="border-t border-border bg-background text-foreground">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:px-8 md:py-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-6">
          <h2 className="font-prensa text-[clamp(1.5rem,2.6vw,2.125rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-balance">
            ¿Presenta rendiciones? Cargue su Libro Banco desde Excel.
          </h2>
          <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
            Los responsables de carga eligen el organismo y el período, suben la
            planilla y revisan la vista previa antes de confirmar. La cuenta se
            solicita por registro y un administrador la activa.
          </p>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="mt-8 h-12 rounded-none border-2 border-foreground px-7 text-base font-bold"
          >
            <Link to="/registro">Registrarse como responsable</Link>
          </Button>
        </div>

        <figure className="lg:col-span-6">
          <div className="border border-border bg-card p-6 text-card-foreground shadow-[0_28px_50px_-26px_rgba(0,0,0,0.25),0_2px_5px_rgba(0,0,0,0.08)] dark:ring-1 dark:ring-white/15 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
              <h3 className="font-prensa text-base font-extrabold">
                Planilla de carga
              </h3>
              <Folio numero={18} />
            </div>
            <dl className="mt-4 font-maquina text-sm">
              {campos.map(({ campo, valor }) => (
                <div
                  key={campo}
                  className="grid grid-cols-[7rem_1fr] gap-x-3 border-b border-dotted border-border py-2.5"
                >
                  <dt className="text-muted-foreground">{campo}</dt>
                  <dd className="font-bold">{valor}</dd>
                </div>
              ))}
            </dl>
          </div>
          <figcaption className="mt-3">
            <Ilustrativo className="text-muted-foreground" />
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
