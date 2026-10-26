import { Activity, Loader2 } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useActividad } from '../hooks/useActividad';
import { useExportarActividad } from '../hooks/useExportarActividad';
import { contarFiltros } from '../lib/filtros';
import type { FiltrosActividad } from '../types';
import { FiltrosActividadForm } from './FiltrosActividadForm';
import { TablaActividad } from './TablaActividad';

/** Bitácora de actividad del sistema: solo lectura, para el supervisor. */
export function ActividadPage() {
  const [filtros, setFiltros] = useState<FiltrosActividad>({});
  const actividad = useActividad(filtros);
  const exportar = useExportarActividad();

  const eventos =
    actividad.data?.pages.flatMap((pagina) => pagina.eventos) ?? [];
  const filtrada = contarFiltros(filtros) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bitácora de actividad"
        description="Registro de lo que hicieron los usuarios en el sistema, del más reciente al más antiguo. Es de solo lectura."
      />

      <FiltrosActividadForm
        onAplicar={setFiltros}
        onExportar={() => exportar.mutate(filtros)}
        exportando={exportar.isPending}
      />

      {actividad.isPending && (
        <div className="space-y-2" aria-busy="true" aria-label="Cargando">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      )}

      {actividad.isError && (
        <ErrorAlert
          error={actividad.error}
          onRetry={() => void actividad.refetch()}
          retrying={actividad.isFetching}
        />
      )}

      {actividad.data && eventos.length === 0 && (
        <EmptyState
          icon={Activity}
          title={
            filtrada
              ? 'Ninguna actividad coincide con los filtros'
              : 'Todavía no hay actividad registrada'
          }
          description={
            filtrada
              ? 'Pruebe con otro rango de fechas o quite algún filtro.'
              : 'Los eventos aparecerán acá a medida que los usuarios usen el sistema.'
          }
        />
      )}

      {eventos.length > 0 && (
        <section className="space-y-3">
          <p role="status" className="text-sm text-muted-foreground">
            {eventos.length === 1 ? '1 evento' : `${eventos.length} eventos`}{' '}
            {actividad.hasNextPage ? 'cargados' : 'en total'}
            {filtrada ? ' con los filtros aplicados' : ''}
          </p>
          <TablaActividad eventos={eventos} />
          {actividad.hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => void actividad.fetchNextPage()}
                disabled={actividad.isFetchingNextPage}
              >
                {actividad.isFetchingNextPage && (
                  <Loader2 className="animate-spin" />
                )}
                Cargar más
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
