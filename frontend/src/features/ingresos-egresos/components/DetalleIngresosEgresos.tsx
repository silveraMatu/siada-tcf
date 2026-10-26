import { X } from 'lucide-react';

import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { FilaResaltada } from '@/features/libro-banco/hooks/useFilaResaltada';
import { formatearMomento } from '@/features/libro-banco/lib/formato-libro';
import { useIngresosEgresos } from '../hooks/useIngresosEgresos';
import { guardadoAFilas } from '../lib/guardado-a-filas';
import { PreviewIngresosEgresosTable } from './PreviewIngresosEgresosTable';

interface DetalleIngresosEgresosProps {
  cuentaMensualId: number;
  nombre: string;
  onCerrar: () => void;
  /** Fila a ubicar al abrir la pestaña (por ejemplo, la de una observación del auditor). */
  resaltar?: FilaResaltada;
}

/** Contenido de la pestaña del libro de Ingresos y Egresos: sus filas y columnas, en solo lectura. */
export function DetalleIngresosEgresos({
  cuentaMensualId,
  nombre,
  onCerrar,
  resaltar,
}: DetalleIngresosEgresosProps) {
  const { data, isPending, isError, error, refetch, isFetching } =
    useIngresosEgresos(cuentaMensualId);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="font-medium">{nombre}</h4>
          {data && (
            <p className="text-sm text-muted-foreground">
              {data.transacciones.length === 1
                ? '1 fila'
                : `${data.transacciones.length} filas`}{' '}
              · cargado el {formatearMomento(data.fechaCreacion)}
            </p>
          )}
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
        <PreviewIngresosEgresosTable
          filas={guardadoAFilas(data)}
          className="max-h-[420px]"
          resaltar={resaltar}
        />
      )}
    </div>
  );
}
