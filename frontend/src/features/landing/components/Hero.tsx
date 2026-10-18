import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { PlanillaHero } from './PlanillaHero';

const cadena = [
  { rol: 'Presenta', quien: 'Responsable de carga del organismo' },
  { rol: 'Verifica', quien: 'Motor determinístico' },
  { rol: 'Consulta', quien: 'Asistente de IA' },
  { rol: 'Dictamina', quien: 'Delegado fiscal', destacado: true },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_35px,hsl(var(--border)/0.6)_35px,hsl(var(--border)/0.6)_36px)]"
      />
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 px-4 pb-16 pt-14 md:px-8 lg:grid-cols-12 lg:gap-10 lg:pb-12 lg:pt-12">
        <div className="min-w-0 lg:col-span-7">
          <h1 className="font-prensa text-[clamp(2.25rem,4.4vw,3.6rem)] font-extrabold leading-[1.04] tracking-[-0.025em] text-balance">
            Acompañamos al{' '}
            <span className="underline decoration-foreground/30 decoration-4 underline-offset-[7px]">
              delegado fiscal
            </span>{' '}
            en la auditoría de las rendiciones de cuentas.
          </h1>
          <p className="mt-7 max-w-[52ch] text-lg leading-relaxed text-muted-foreground">
            SIADA ordena la carga de cada rendición mensual, verifica las cifras
            con un motor determinístico y pone a su disposición un asistente de
            IA para consultar los datos. El respaldo es del sistema; la
            decisión, siempre del delegado.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-none px-8 text-base font-bold"
            >
              <Link to="/login">
                Iniciar sesión
                <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-none border-2 border-foreground px-8 text-base font-semibold"
            >
              <Link to="/registro">Registrarse</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            El registro es para responsables de carga; un administrador activa
            cada cuenta.
          </p>
        </div>
        <div className="min-w-0 lg:col-span-5">
          <PlanillaHero />
        </div>
      </div>

      <div className="relative border-t border-border">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {cadena.map(({ rol, quien, destacado }) => (
            <div
              key={rol}
              className={
                'border-border px-4 py-5 md:border-l md:px-6 md:first:border-l-0 md:first:pl-8 ' +
                (destacado ? 'bg-foreground text-background' : '')
              }
            >
              <dt className="font-prensa text-lg font-extrabold leading-tight">
                {rol}
              </dt>
              <dd
                className={
                  'mt-1 text-sm leading-snug ' +
                  (destacado ? 'text-background/80' : 'text-muted-foreground')
                }
              >
                {quien}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
