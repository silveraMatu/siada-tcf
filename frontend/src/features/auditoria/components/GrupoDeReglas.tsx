import type { ReactNode } from 'react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ResumenResultados } from '../types/auditoria.types';

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

/** «3 verificadas · 1 con observaciones · 2 no aplican»: solo lo que no es cero. */
function describirResumen(resumen: ResumenResultados): string {
  return [
    resumen.verificadas > 0 &&
      plural(resumen.verificadas, 'verificada', 'verificadas'),
    resumen.fallidas > 0 &&
      plural(resumen.fallidas, 'con observaciones', 'con observaciones'),
    resumen.omitidas > 0 && plural(resumen.omitidas, 'omitida', 'omitidas'),
    resumen.noAplican > 0 &&
      (resumen.noAplican === 1
        ? '1 no aplica'
        : `${resumen.noAplican} no aplican`),
  ]
    .filter(Boolean)
    .join(' · ');
}

interface GrupoDeReglasProps {
  titulo: string;
  resumen: ResumenResultados;
  children: ReactNode;
}

/**
 * Una sección de la lista de reglas, por tipo de validación (internas, cruces, cheques, fechas), con su
 * propio resumen. Se puede plegar para quedarse con lo que interesa.
 */
export function GrupoDeReglas({
  titulo,
  resumen,
  children,
}: GrupoDeReglasProps) {
  return (
    <Collapsible defaultOpen asChild>
      <section aria-label={titulo} className="space-y-3">
        <h3 className="text-sm font-semibold">
          <CollapsibleTrigger className="flex-wrap gap-x-3">
            <span>{titulo}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {describirResumen(resumen)}
            </span>
          </CollapsibleTrigger>
        </h3>
        <CollapsibleContent className="p-0.5">{children}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}
