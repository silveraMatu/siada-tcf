import {
  CheckCircle2,
  ShieldAlert,
  XCircle,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { RESULTADOS } from '../constants';
import type { ResultadoActividad } from '../types';

const ESTILOS: Record<
  ResultadoActividad,
  { icono: LucideIcon; clase: string }
> = {
  EXITO: { icono: CheckCircle2, clase: 'text-success' },
  FALLO: { icono: XCircle, clase: 'text-danger' },
  DENEGADO: { icono: ShieldAlert, clase: 'text-warning' },
};

/** Éxito, fallo o denegado: siempre con ícono y texto, el color solo refuerza. */
export function ResultadoBadge({
  resultado,
}: {
  resultado: ResultadoActividad;
}) {
  const estilo = ESTILOS[resultado];
  const Icono = estilo?.icono;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium',
        estilo?.clase ?? 'text-muted-foreground',
      )}
    >
      {Icono && <Icono className="size-4" aria-hidden />}
      {RESULTADOS[resultado] ?? resultado}
    </span>
  );
}
