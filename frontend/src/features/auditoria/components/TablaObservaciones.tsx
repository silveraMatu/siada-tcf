import { Check, Crosshair, Loader2, RotateCcw, X } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRevisarObservacion } from '../hooks/useRevisarObservacion';
import type { ObservacionUbicada } from '../types/auditoria.types';
import { DescartarObservacionDialog } from './DescartarObservacionDialog';
import { EstadoObservacionBadge } from './EstadoObservacionBadge';

const formatoImporte = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatoMomento = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface TablaObservacionesProps {
  codigoRegla: string;
  observaciones: readonly ObservacionUbicada[];
  /** Los libros todavía se están trayendo, así que la fila no se puede indicar aún. */
  ubicando: boolean;
  /** Solo con la rendición en auditoría y sin cerrar: antes y después las observaciones son de solo lectura. */
  puedeRevisar: boolean;
  cuentaMensualId: number;
  onVerEnLibro: (observacion: ObservacionUbicada) => void;
}

/** Los hallazgos de una regla: dónde están, cuánto difieren y cómo va su revisión. */
export function TablaObservaciones({
  codigoRegla,
  observaciones,
  ubicando,
  puedeRevisar,
  cuentaMensualId,
  onVerEnLibro,
}: TablaObservacionesProps) {
  const revisar = useRevisarObservacion(cuentaMensualId);
  const [paraDescartar, setParaDescartar] = useState<number | null>(null);
  // qué observación se está guardando, para trabar solo sus botones
  const enviandoId = revisar.isPending
    ? revisar.variables?.observacionId
    : null;

  function decidir(observacionId: number, decision: 'CONFIRMAR' | 'REABRIR') {
    revisar.mutate({ observacionId, decision });
  }

  return (
    <div className="max-h-96 overflow-auto rounded-lg border bg-card text-card-foreground">
      <Table>
        <TableCaption className="sr-only">
          Observaciones de la regla {codigoRegla}
        </TableCaption>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-16 text-right">Fila</TableHead>
            <TableHead>Libro</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-px">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {observaciones.map((observacion) => {
            const ubicada =
              observacion.libroId !== undefined &&
              observacion.transaccionId !== null;
            const trabada = enviandoId === observacion.id;
            return (
              <TableRow key={observacion.id}>
                <TableCell className="text-right font-medium tabular-nums">
                  {ubicando && observacion.transaccionId !== null ? (
                    <Skeleton className="ml-auto h-4 w-6" />
                  ) : (
                    (observacion.fila ?? '—')
                  )}
                </TableCell>
                <TableCell className="max-w-28 break-words sm:max-w-none sm:whitespace-nowrap">
                  {observacion.libroNombre ?? '—'}
                </TableCell>
                <TableCell className="min-w-40 space-y-1.5 sm:min-w-64">
                  <p>{observacion.mensaje}</p>
                  {observacion.valorInformado !== null && (
                    <dl className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
                      <div className="flex gap-1">
                        <dt>Informado</dt>
                        <dd className="font-medium text-foreground">
                          {formatoImporte.format(observacion.valorInformado)}
                        </dd>
                      </div>
                      {observacion.valorCalculado !== null && (
                        <div className="flex gap-1">
                          <dt>Calculado</dt>
                          <dd className="font-medium text-foreground">
                            {formatoImporte.format(observacion.valorCalculado)}
                          </dd>
                        </div>
                      )}
                      {observacion.diferencia !== null && (
                        <div className="flex gap-1">
                          <dt>Diferencia</dt>
                          <dd className="font-medium text-danger">
                            {formatoImporte.format(observacion.diferencia)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {observacion.estado === 'DESCARTADA' &&
                    observacion.motivoDescarte && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Motivo:</span>{' '}
                        {observacion.motivoDescarte}
                      </p>
                    )}
                  {observacion.estado !== 'ABIERTA' &&
                    observacion.revisadaEn && (
                      <p className="text-xs text-muted-foreground">
                        Revisada
                        {observacion.revisadaPor &&
                          ` por ${observacion.revisadaPor.nombre} ${observacion.revisadaPor.apellido}`}{' '}
                        el{' '}
                        {formatoMomento.format(
                          new Date(observacion.revisadaEn),
                        )}
                      </p>
                    )}
                </TableCell>
                <TableCell>
                  <EstadoObservacionBadge estado={observacion.estado} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {ubicada && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVerEnLibro(observacion)}
                        aria-label={`Ver la fila ${observacion.fila} de ${observacion.libroNombre} en el libro`}
                      >
                        <Crosshair />
                        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                          Ver en el libro
                        </span>
                      </Button>
                    )}
                    {puedeRevisar && observacion.estado === 'ABIERTA' && (
                      <>
                        <Button
                          size="sm"
                          disabled={trabada}
                          aria-label={`Confirmar la observación ${observacion.id}`}
                          onClick={() => decidir(observacion.id, 'CONFIRMAR')}
                        >
                          {trabada ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Check />
                          )}
                          Confirmar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={trabada}
                          aria-label={`Descartar la observación ${observacion.id}`}
                          onClick={() => setParaDescartar(observacion.id)}
                        >
                          <X />
                          Descartar
                        </Button>
                      </>
                    )}
                    {puedeRevisar && observacion.estado !== 'ABIERTA' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={trabada}
                        aria-label={`Reabrir la observación ${observacion.id}`}
                        onClick={() => decidir(observacion.id, 'REABRIR')}
                      >
                        {trabada ? (
                          <Loader2 className="animate-spin" />
                        ) : (
                          <RotateCcw />
                        )}
                        Reabrir
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <DescartarObservacionDialog
        open={paraDescartar !== null}
        enviando={revisar.isPending}
        onCancelar={() => setParaDescartar(null)}
        onConfirmar={(motivo) => {
          if (paraDescartar === null) return;
          revisar.mutate(
            {
              observacionId: paraDescartar,
              decision: 'DESCARTAR',
              motivo,
            },
            { onSettled: () => setParaDescartar(null) },
          );
        }}
      />
    </div>
  );
}
