import { X } from 'lucide-react';

import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { nombreCompleto } from '@/lib/persona';
import { useLibrosBanco } from '../hooks/useLibrosBanco';
import { describirTransacciones } from '../lib/formato-libro';
import { libroAFilas } from '../lib/libro-a-filas';
import { HuellaDocumento } from './HuellaDocumento';
import { PreviewTable, type FilaResaltada } from './PreviewTable';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });

interface DetalleLibroProps {
  cuentaMensualId: number;
  libroId: number;
  nombre: string;
  onCerrar: () => void;
  /** Fila a ubicar al abrir la pestaña (por ejemplo, la de una observación del auditor). */
  resaltar?: FilaResaltada;
}

/**
 * Contenido de la pestaña de un libro: sus filas y columnas. Trae los libros de la rendición recién
 * cuando se abre la pestaña (el listado solo trae el resumen) y los comparte con las demás pestañas.
 */
export function DetalleLibro({
  cuentaMensualId,
  libroId,
  nombre,
  onCerrar,
  resaltar,
}: DetalleLibroProps) {
  const { data, isPending, isError, error, refetch, isFetching } =
    useLibrosBanco(cuentaMensualId);
  const libro = data?.find((candidato) => candidato.id === libroId);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h4 className="font-medium">{nombre}</h4>
          {libro && (
            <p className="text-sm text-muted-foreground">
              {describirTransacciones(libro.transacciones.length)} · cargado el{' '}
              {formatoFecha.format(new Date(libro.fechaCreacion))}
              {libro.subidoPor && ` por ${nombreCompleto(libro.subidoPor)}`}
            </p>
          )}
          {libro && <HuellaDocumento hash={libro.hashContenido} />}
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

      {data && !libro && (
        <p className="text-sm text-muted-foreground">
          Este libro ya no figura en la rendición.
        </p>
      )}

      {libro && (
        <PreviewTable
          filas={libroAFilas(libro)}
          className="max-h-[420px]"
          resaltar={resaltar}
        />
      )}
    </div>
  );
}
