import { AlertCircle } from 'lucide-react';

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

export function PreviewTable({
  filas,
  className,
}: {
  filas: FilaPreview[];
  /** Para cambiar el alto máximo (por defecto 320px) cuando la tabla es el contenido principal. */
  className?: string;
}) {
  return (
    <div
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
          {filas.map(({ fila, transaccion: t, errores }) => (
            <TableRow
              key={fila}
              className={cn(
                errores.length > 0 && 'bg-danger-subtle hover:bg-danger-subtle',
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
