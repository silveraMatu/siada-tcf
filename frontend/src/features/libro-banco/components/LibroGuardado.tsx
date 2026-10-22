import { FileSpreadsheet } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Skeleton } from '@/components/ui/skeleton';
import { useLibrosBanco } from '../hooks/useLibrosBanco';
import { resumirLibro } from '../lib/resumir-libro';
import { LibrosDeRendicion } from './LibrosDeRendicion';

interface LibroGuardadoProps {
  cuentaMensualId: number;
  /** En borrador el estado vacío invita a cargar el primer libro; presentada, solo informa. */
  enBorrador?: boolean;
}

/**
 * Libros ya guardados de una rendición, en solo lectura: el resumen de cada uno y, al clicar su
 * nombre, una pestaña con sus filas y columnas.
 */
export function LibroGuardado({
  cuentaMensualId,
  enBorrador = false,
}: LibroGuardadoProps) {
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
    return enBorrador ? (
      <EmptyState
        icon={FileSpreadsheet}
        title="Todavía no cargó ningún libro"
        description="Use «Cargar Documentos» para subir el Libro Banco de cada cuenta corriente."
      />
    ) : (
      <EmptyState
        icon={FileSpreadsheet}
        title="Esta rendición no tiene libros cargados"
        description="Se presentó sin documentos."
      />
    );
  }

  return (
    <LibrosDeRendicion
      cuentaMensualId={cuentaMensualId}
      libros={data.map(resumirLibro)}
      etiqueta="Libros cargados"
    />
  );
}
