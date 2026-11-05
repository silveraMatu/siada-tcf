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
import type { FilaRaciPreview, TransaccionRaci } from '../types';

const formatoMonto = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function monto(valor: number): string {
  return Number.isFinite(valor) ? formatoMonto.format(valor) : '—';
}

type CampoMonto =
  | 'compromisoDelMes'
  | 'compromisoAcumulado'
  | 'devengadoDelMes'
  | 'devengadoAcumulado'
  | 'devengadoSaldo'
  | 'pagoDelMes'
  | 'pagoAcumulado'
  | 'pagoSaldoAPagar';

type CampoTexto = keyof Pick<
  TransaccionRaci,
  | 'compromisoInstrumentoLegal'
  | 'compromisoOrdenProvision'
  | 'devengadoOrdenPago'
  | 'pagoNumeroCheque'
>;

/**
 * Columnas posteriores al concepto, en el orden de la planilla. Cada texto va bajo el grupo al que
 * pertenece en la planilla: «Ord. de Prov.» en Compromiso, «Ord. de Pago» en Devengado y «Cheque» en Pago.
 */
const COLUMNAS: (
  | { tipo: 'monto'; campo: CampoMonto; titulo: string }
  | { tipo: 'texto'; campo: CampoTexto; titulo: string }
)[] = [
  {
    tipo: 'texto',
    campo: 'compromisoInstrumentoLegal',
    titulo: 'Instr. legal',
  },
  { tipo: 'monto', campo: 'compromisoDelMes', titulo: 'Compromiso (Del mes)' },
  {
    tipo: 'monto',
    campo: 'compromisoAcumulado',
    titulo: 'Compromiso (Acumulado)',
  },
  {
    tipo: 'texto',
    campo: 'compromisoOrdenProvision',
    titulo: 'Ord. de provisión',
  },
  { tipo: 'monto', campo: 'devengadoDelMes', titulo: 'Devengado (Del mes)' },
  {
    tipo: 'monto',
    campo: 'devengadoAcumulado',
    titulo: 'Devengado (Acumulado)',
  },
  { tipo: 'monto', campo: 'devengadoSaldo', titulo: 'Devengado (Saldo)' },
  { tipo: 'texto', campo: 'devengadoOrdenPago', titulo: 'Ord. de pago' },
  { tipo: 'texto', campo: 'pagoNumeroCheque', titulo: 'Cheque' },
  { tipo: 'monto', campo: 'pagoDelMes', titulo: 'Pago (Del mes)' },
  { tipo: 'monto', campo: 'pagoAcumulado', titulo: 'Pago (Acumulado)' },
  { tipo: 'monto', campo: 'pagoSaldoAPagar', titulo: 'Pago (Saldo a pagar)' },
];

export function PreviewRaciTable({
  filas,
  className,
  resaltar,
}: {
  filas: FilaRaciPreview[];
  /** Para cambiar el alto máximo (por defecto 320px). */
  className?: string;
  /** Lleva la vista hasta ese asiento, le da el foco y lo marca unos segundos. */
  resaltar?: FilaResaltada;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const marcada = useFilaResaltada(contenedor, resaltar);
  // la partida solo se conoce al leer el archivo: un libro guardado no la trae
  const conPartida = filas.some((f) => f.partida);

  return (
    // La planilla tiene 17 columnas: desplazamiento horizontal y vertical con el encabezado fijo.
    <div
      ref={contenedor}
      tabIndex={0}
      aria-label="Asientos del RACI"
      className={cn(
        'max-h-[320px] overflow-auto rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow>
            <TableHead className="w-12 text-right">#</TableHead>
            {conPartida && <TableHead>Partida</TableHead>}
            <TableHead className="whitespace-nowrap text-right">
              N° As.
            </TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Expte. N°</TableHead>
            <TableHead>Concepto</TableHead>
            {COLUMNAS.map(({ campo, titulo, tipo }) => (
              <TableHead
                key={campo}
                className={cn(
                  'whitespace-nowrap',
                  tipo === 'monto' && 'text-right',
                )}
              >
                {titulo}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map(({ id, fila, partida, transaccion: t, errores }) => (
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
              {conPartida && (
                <TableCell className="min-w-32 text-xs text-muted-foreground">
                  {partida ?? '—'}
                </TableCell>
              )}
              <TableCell className="text-right font-medium tabular-nums">
                {t.asiento > 0 ? t.asiento : '—'}
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {t.fecha ? formatearFecha(t.fecha) : '—'}
              </TableCell>
              <TableCell>{t.expediente ?? '—'}</TableCell>
              <TableCell className="min-w-56">
                {t.concepto || '—'}
                {errores.length > 0 && (
                  <p className="mt-1 flex items-start gap-1 text-xs text-danger">
                    <AlertCircle className="mt-0.5 size-3 shrink-0" />
                    {errores.join('. ')}
                  </p>
                )}
              </TableCell>
              {COLUMNAS.map((columna) =>
                columna.tipo === 'monto' ? (
                  <TableCell
                    key={columna.campo}
                    className="text-right tabular-nums"
                  >
                    {monto(t[columna.campo])}
                  </TableCell>
                ) : (
                  <TableCell key={columna.campo}>
                    {t[columna.campo] ?? '—'}
                  </TableCell>
                ),
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
