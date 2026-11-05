import { X } from 'lucide-react';

import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { FilaResaltada } from '@/features/libro-banco/hooks/useFilaResaltada';
import { HuellaDocumento } from '@/features/libro-banco/components/HuellaDocumento';
import { formatearMomento } from '@/features/libro-banco/lib/formato-libro';
import { nombreCompleto } from '@/lib/persona';
import { useRaci } from '../hooks/useRaci';
import { guardadoAFilas } from '../lib/guardado-a-filas';
import { PreviewRaciTable } from './PreviewRaciTable';

interface DetalleRaciProps {
  cuentaMensualId: number;
  nombre: string;
  onCerrar: () => void;
  /** Asiento a ubicar al abrir la pestaña (por ejemplo, el de una observación del auditor). */
  resaltar?: FilaResaltada;
}

/** Contenido de la pestaña del libro RACI: sus asientos y columnas, en solo lectura. */
export function DetalleRaci({
  cuentaMensualId,
  nombre,
  onCerrar,
  resaltar,
}: DetalleRaciProps) {
  const { data, isPending, isError, error, refetch, isFetching } =
    useRaci(cuentaMensualId);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="font-medium">{nombre}</h4>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.transacciones.length === 1
                ? '1 asiento'
                : `${data.transacciones.length} asientos`}{' '}
              · cargado el {formatearMomento(data.fechaCreacion)}
              {data.subidoPor && ` por ${nombreCompleto(data.subidoPor)}`}
            </p>
          )}
          {data && <HuellaDocumento hash={data.hashContenido} />}
        </div>
        <Button variant="ghost" size="sm" onClick={onCerrar}>
          <X />
          Cerrar
        </Button>
      </div>

      {isPending && (
        <div aria-busy="true">
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      )}

      {isError && (
        <ErrorAlert
          error={error}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      {data === null && (
        <p className="text-sm text-muted-foreground">
          Este libro ya no figura en la rendición.
        </p>
      )}

      {data && (
        <PreviewRaciTable
          filas={guardadoAFilas(data)}
          className="max-h-[420px]"
          resaltar={resaltar}
        />
      )}
    </div>
  );
}
