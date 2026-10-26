import { CircleDashed, Flag, XCircle, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { EstadoObservacion } from '../types/auditoria.types';

const ESTADOS: Record<
  EstadoObservacion,
  { etiqueta: string; icono: LucideIcon; clase: string }
> = {
  ABIERTA: {
    etiqueta: 'Abierta',
    icono: CircleDashed,
    clase: 'text-warning',
  },
  CONFIRMADA: { etiqueta: 'Confirmada', icono: Flag, clase: 'text-danger' },
  DESCARTADA: {
    etiqueta: 'Descartada',
    icono: XCircle,
    clase: 'text-muted-foreground',
  },
};

/** Cómo va la revisión de un hallazgo: siempre ícono y texto, el color solo refuerza. */
export function EstadoObservacionBadge({
  estado,
}: {
  estado: EstadoObservacion;
}) {
  const config = ESTADOS[estado];
  const Icono = config?.icono;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium',
        config?.clase ?? 'text-muted-foreground',
      )}
    >
      {Icono && <Icono className="size-4" aria-hidden />}
      {config?.etiqueta ?? estado}
    </span>
  );
}
