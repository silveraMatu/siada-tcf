import { AlertCircle } from 'lucide-react';
import { useRef } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useFilaResaltada,
  type FilaResaltada,
} from '@/features/libro-banco/hooks/useFilaResaltada';
import { formatearFecha } from '@/features/libro-banco/lib/formato-libro';
import { cn } from '@/lib/utils';
import type { FilaRaiPreview } from '../types';

const formatoMonto = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function monto(valor: number): string {
  return Number.isFinite(valor) ? formatoMonto.format(valor) : '—';
}

const COLUMNAS_DE_IMPORTE = [
  { campo: 'ingresosDiarios', titulo: 'Ingresos diarios' },
  { campo: 'ingresosMensuales', titulo: 'Ingresos mensuales' },
  { campo: 'ingresosAcumulados', titulo: 'Ingresos acumulados' },
  { campo: 'saldo', titulo: 'Saldo' },
] as const;

export function PreviewRaiTable({
  filas,
  className,
  resaltar,
}: {
  filas: FilaRaiPreview[];
  /** Para cambiar el alto máximo (por defecto 320px). */
  className?: string;
  /** Lleva la vista hasta ese asiento, le da el foco y lo marca unos segundos. */
  resaltar?: FilaResaltada;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const marcada = useFilaResaltada(contenedor, resaltar);

  return (
    <div
      ref={contenedor}
      tabIndex={0}
      aria-label="Asientos del RAI"
      className={cn(
        'max-h-[320px] overflow-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead className="whitespace-nowrap text-right">
              Asto. N°
            </TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="whitespace-nowrap">Planilla N°</TableHead>
            <TableHead>Concepto</TableHead>
            {COLUMNAS_DE_IMPORTE.map(({ campo, titulo }) => (
              <TableHead key={campo} className="whitespace-nowrap text-right">
                {titulo}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ id, fila, transaccion: t, errores }) => (
            <TableRow
              key={fila}
              data-transaccion-id={id}
              tabIndex={id === undefined ? undefined : -1}
              aria-current={
                id !== undefined && id === marcada ? 'true' : undefined
              }
              className={cn(
                'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                errores.length > 0 && 'bg-danger-subtle hover:bg-danger-subtle',
                id !== undefined &&
                  id === marcada &&
                  'bg-warning-subtle ring-2 ring-inset ring-warning-border hover:bg-warning-subtle',
              )}
            >
              <TableCell className="text-right text-xs text-muted-foreground">
                {fila}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {t.asiento ?? '—'}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {t.fecha ? formatearFecha(t.fecha) : '—'}
              </TableCell>
              <TableCell>{t.planillaNumero ?? '—'}</TableCell>
              <TableCell className="min-w-56">
                {t.concepto || '—'}
                {errores.length > 0 && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-danger">
                    <AlertCircle className="mt-0.5 size-3 shrink-0" />
                    {errores.join('. ')}
                  </p>
                )}
              </TableCell>
              {COLUMNAS_DE_IMPORTE.map(({ campo }) => (
                <TableCell key={campo} className="text-right tabular-nums">
                  {monto(t[campo])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
