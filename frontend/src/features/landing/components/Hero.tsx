import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,theme(colors.slate.100)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.slate.100)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />
      <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center md:py-36">
        <Badge
          variant="outline"
          className="gap-2 rounded-full border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
        >
          <span className="size-1.5 rounded-full bg-blue-600" aria-hidden />
          Innovación en el Control Público
        </Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl md:leading-[1.05]">
          Auditoría Inteligente para una Gestión Pública Transparente.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
          Plataforma automatizada para el control externo de los recursos
          públicos de la Provincia de Formosa. Agilice las rendiciones
          mensuales, detecte inconsistencias al instante y potencie el control
          constructivo mediante Inteligencia Artificial.
        </p>
        <Button
          asChild
          size="lg"
          className={cn(
            'mt-10 h-12 bg-blue-600 px-7 text-base text-white hover:bg-blue-700',
          )}
        >
          <Link to="/organismos">
            Ingresar al Dashboard
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
