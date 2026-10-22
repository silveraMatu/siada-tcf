import { FileSpreadsheet } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Skeleton } from '@/components/ui/skeleton';
import { useLibrosBanco } from '../hooks/useLibrosBanco';
import { libroAFilas } from '../lib/libro-a-filas';
import { PreviewTable } from './PreviewTable';

/** Libros ya guardados de una rendición, en solo lectura. */
export function LibroGuardado({
  cuentaMensualId,
}: {
  cuentaMensualId: number;
}) {
  const { data, isPending, isError, error, refetch, isFetching } =
    useLibrosBanco(cuentaMensualId);

  if (isPending) {
    return (
      <div aria-busy="true">
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorAlert
        error={error}
        onRetry={() => void refetch()}
        retrying={isFetching}
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={FileSpreadsheet}
        title="Esta rendición no tiene libros cargados"
        description="Se presentó sin documentos."
      />
    );
  }

  return (
    <div className="space-y-6">
      {data.map((libro) => (
        <section key={libro.id} className="space-y-3">
          <h3 className="text-sm font-medium">
            Libro Banco · Cta. Cte. {libro.numeroCuentaCte ?? 'sin número'}
            <span className="font-normal text-muted-foreground">
              {' '}
              · {libro.transacciones.length}{' '}
              {libro.transacciones.length === 1
                ? 'transacción'
                : 'transacciones'}
            </span>
          </h3>
          <PreviewTable filas={libroAFilas(libro)} />
        </section>
      ))}
    </div>
  );
}
