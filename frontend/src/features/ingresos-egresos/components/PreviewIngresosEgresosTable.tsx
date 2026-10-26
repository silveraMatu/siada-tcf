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
import type {
  FilaIngresoEgresoPreview,
  TransaccionIngresoEgreso,
} from '../types';

const formatoMonto = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function monto(valor: number): string {
  return Number.isFinite(valor) ? formatoMonto.format(valor) : '—';
}

type CampoMonto = Exclude<
  {
    [K in keyof TransaccionIngresoEgreso]-?: NonNullable<
      TransaccionIngresoEgreso[K]
    > extends number
      ? K
      : never;
  }[keyof TransaccionIngresoEgreso],
  'fila'
>;

/** Columnas numéricas que siguen a las principales, en el orden de la planilla. */
const COLUMNAS_DETALLE: { campo: CampoMonto; titulo: string }[] = [
  { campo: 'cajaDebe', titulo: 'Caja (Debe)' },
  { campo: 'cajaHaber', titulo: 'Caja (Haber)' },
  { campo: 'bancoDebe', titulo: 'Banco (Debe)' },
  { campo: 'bancoHaber', titulo: 'Banco (Haber)' },
  { campo: 'egresoInc1', titulo: 'Egreso inc. 1' },
  { campo: 'egresoInc2', titulo: 'Egreso inc. 2' },
  { campo: 'egresoInc3', titulo: 'Egreso inc. 3' },
  { campo: 'egresoInc4', titulo: 'Egreso inc. 4' },
  { campo: 'egresoInc5', titulo: 'Egreso inc. 5' },
  { campo: 'ingresoMunicipal', titulo: 'Ingreso municipal' },
  { campo: 'ingresoOtras', titulo: 'Ingreso otras' },
];

export function PreviewIngresosEgresosTable({
  filas,
  className,
  resaltar,
}: {
  filas: FilaIngresoEgresoPreview[];
  /** Para cambiar el alto máximo (por defecto 320px). */
  className?: string;
  /** Lleva la vista hasta esa transacción, le da el foco y la marca unos segundos. */
  resaltar?: FilaResaltada;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const marcada = useFilaResaltada(contenedor, resaltar);

  return (
    // La planilla tiene 20 columnas: desplazamiento horizontal y vertical con el encabezado fijo.
    <div
      ref={contenedor}
      className={cn(
        'max-h-[320px] overflow-auto overflow-x-auto rounded-lg border',
        className,
      )}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-12 text-right">#</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Concepto</TableHead>
            <TableHead className="text-right">Caja (Saldo)</TableHead>
            <TableHead className="text-right">Banco (Saldo)</TableHead>
            <TableHead>Cheque</TableHead>
            <TableHead>Comprobante</TableHead>
            {COLUMNAS_DETALLE.map(({ campo, titulo }) => (
              <TableHead key={campo} className="whitespace-nowrap text-right">
                {titulo}
              </TableHead>
            ))}
            <TableHead>Cuentas varias</TableHead>
            <TableHead className="whitespace-nowrap text-right">
              Cuentas varias (Debe)
            </TableHead>
            <TableHead className="whitespace-nowrap text-right">
              Cuentas varias (Haber)
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ id, transaccion: t, errores }) => (
            <TableRow
              key={t.fila}
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
                {t.fila}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {t.fecha ? formatearFecha(t.fecha) : '—'}
              </TableCell>
              <TableCell className="min-w-56">
                {t.concepto || '—'}
                {errores.length > 0 && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-danger">
                    <AlertCircle className="mt-0.5 size-3 shrink-0" />
                    {errores.join('. ')}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {monto(t.cajaSaldo)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {monto(t.bancoSaldo)}
              </TableCell>
              <TableCell>{t.cheque ?? '—'}</TableCell>
              <TableCell>{t.comprobante ?? '—'}</TableCell>
              {COLUMNAS_DETALLE.map(({ campo }) => (
                <TableCell key={campo} className="text-right tabular-nums">
                  {monto(t[campo])}
                </TableCell>
              ))}
              <TableCell className="min-w-40">
                {t.cuentasVariasConcepto ?? '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {monto(t.cuentasVariasDebe)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {monto(t.cuentasVariasHaber)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
