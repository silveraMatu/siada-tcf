import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  EstadoValidacion,
  ResumenResultados,
} from '../types/auditoria.types';

interface Tarjeta {
  estado: EstadoValidacion;
  titulo: string;
  icono: LucideIcon;
  /** Colores del número y del ícono cuando hay reglas en ese estado. */
  tono: string;
  /** Colores de la tarjeta mientras es el filtro activo. */
  activa: string;
  detalle: (resumen: ResumenResultados) => string;
  cantidad: (resumen: ResumenResultados) => number;
}

const TARJETAS: Tarjeta[] = [
  {
    estado: 'VERIFICADO',
    titulo: 'Verificadas',
    icono: CheckCircle2,
    tono: 'text-success',
    activa: 'border-success-border bg-success-subtle',
    detalle: () => 'sin hallazgos',
    cantidad: (resumen) => resumen.verificadas,
  },
  {
    estado: 'FALLO',
    titulo: 'Fallidas',
    icono: AlertTriangle,
    tono: 'text-danger',
    activa: 'border-danger-border bg-danger-subtle',
    detalle: ({ observaciones }) =>
      observaciones === 1 ? '1 observación' : `${observaciones} observaciones`,
    cantidad: (resumen) => resumen.fallidas,
  },
  {
    estado: 'FALTAN_LIBROS',
    titulo: 'Omitidas',
    icono: Clock,
    tono: 'text-muted-foreground',
    activa: 'border-border bg-muted',
    detalle: () => 'faltan libros',
    cantidad: (resumen) => resumen.omitidas,
  },
];

interface ScorecardValidacionesProps {
  /** `null` mientras no se ejecutó ninguna validación: las tarjetas muestran «—» y no filtran. */
  resumen: ResumenResultados | null;
  filtro: EstadoValidacion | null;
  onFiltrar: (estado: EstadoValidacion | null) => void;
}

/**
 * Cuántas reglas quedaron verificadas, fallidas y omitidas. Cada tarjeta es además un filtro de la
 * lista (segundo clic para quitarlo); las que no tienen reglas no se pueden elegir para no dejar una
 * lista vacía.
 */
export function ScorecardValidaciones({
  resumen,
  filtro,
  onFiltrar,
}: ScorecardValidacionesProps) {
  return (
    <div
      role="group"
      aria-label="Filtrar las reglas por resultado"
      className="grid grid-cols-3 gap-2 sm:gap-3"
    >
      {TARJETAS.map((tarjeta) => {
        const Icono = tarjeta.icono;
        const cantidad = resumen ? tarjeta.cantidad(resumen) : null;
        const activa = filtro === tarjeta.estado;
        const hayReglas = cantidad !== null && cantidad > 0;

        return (
          <button
            key={tarjeta.estado}
            type="button"
            aria-pressed={activa}
            disabled={!hayReglas}
            onClick={() => onFiltrar(activa ? null : tarjeta.estado)}
            className={cn(
              'flex min-w-0 flex-col items-start gap-1 rounded-xl border bg-card p-3 text-left sm:p-4 shadow-sm outline-none',
              'motion-safe:transition-colors focus-visible:ring-2 focus-visible:ring-ring',
              hayReglas && !activa && 'hover:bg-muted/50',
              !hayReglas && 'cursor-default',
              activa && tarjeta.activa,
            )}
          >
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:gap-2 sm:text-sm">
              <Icono
                aria-hidden
                className={cn('size-4', hayReglas && tarjeta.tono)}
              />
              {tarjeta.titulo}
            </span>
            <span
              className={cn(
                'text-2xl font-semibold tabular-nums leading-none sm:text-3xl',
                hayReglas ? tarjeta.tono : 'text-muted-foreground',
              )}
            >
              {cantidad ?? '—'}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {resumen ? tarjeta.detalle(resumen) : 'sin ejecutar'}
            </span>
          </button>
        );
      })}
    </div>
  );
}
