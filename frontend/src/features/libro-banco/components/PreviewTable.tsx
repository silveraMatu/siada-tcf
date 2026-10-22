import { AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { FilaPreview } from '../types';

const formatoMonto = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function monto(valor: number): string {
  return Number.isFinite(valor) ? formatoMonto.format(valor) : '—';
}

/** Cuánto dura marcada la fila a la que se llevó al auditor. */
const DURACION_RESALTADO_MS = 4000;

/** Fila a ubicar: `clave` cambia en cada pedido, así volver a pedir la misma fila la vuelve a marcar. */
export interface FilaResaltada {
  transaccionId: number;
  clave: number;
}

export function PreviewTable({
  filas,
  className,
  resaltar,
}: {
  filas: FilaPreview[];
  /** Para cambiar el alto máximo (por defecto 320px) cuando la tabla es el contenido principal. */
  className?: string;
  /** Lleva la vista hasta esa transacción, le da el foco y la marca unos segundos. */
  resaltar?: FilaResaltada;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [marcada, setMarcada] = useState<number | null>(null);

  const transaccionId = resaltar?.transaccionId;
  const clave = resaltar?.clave;

  useEffect(() => {
    if (transaccionId === undefined) return;
    const fila = contenedor.current?.querySelector<HTMLElement>(
      `[data-transaccion-id="${transaccionId}"]`,
    );
    if (!fila) return;

    const sinMovimiento = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    fila.focus({ preventScroll: true });
    fila.scrollIntoView({
      block: 'center',
      behavior: sinMovimiento ? 'auto' : 'smooth',
    });
    setMarcada(transaccionId);
    const temporizador = setTimeout(
      () => setMarcada(null),
      DURACION_RESALTADO_MS,
    );
    return () => clearTimeout(temporizador);
  }, [transaccionId, clave]);

  return (
    <div
      ref={contenedor}
      className={cn('max-h-[320px] overflow-auto rounded-lg border', className)}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Cheque</TableHead>
            <TableHead>A la orden de</TableHead>
            <TableHead className="text-right">Depósitos</TableHead>
            <TableHead className="text-right">Retiro</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ fila, id, transaccion: t, errores }) => (
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
              <TableCell className="whitespace-nowrap">
                {t.fecha ?? '—'}
              </TableCell>
              <TableCell>{t.cheque ?? '—'}</TableCell>
              <TableCell className="min-w-48">
                {t.aLaOrdenDe || '—'}
                {errores.length > 0 && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-danger">
                    <AlertCircle className="mt-0.5 size-3 shrink-0" />
                    {errores.join('. ')}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {monto(t.depositos)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {monto(t.retiro)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {monto(t.saldo)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
