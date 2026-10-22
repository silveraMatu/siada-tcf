import { ClipboardCheck } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useCuentasPorEstado } from '@/features/cuentas/hooks/useCuentasPorEstado';
import { agruparPorOrganismo } from '../lib/agrupar-por-organismo';
import { GrupoOrganismoPendiente } from './GrupoOrganismoPendiente';

export function DashboardAuditorPage() {
  const { data, isPending, isError, error, refetch, isFetching } =
    useCuentasPorEstado('LISTO_PARA_AUDITAR');

  const grupos = data ? agruparPorOrganismo(data) : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rendiciones pendientes de auditoría"
        description="Rendiciones mensuales que los organismos ya presentaron y esperan su revisión."
      />

      {isPending && (
        <div aria-busy="true" className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <ErrorAlert
          error={error}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      {data && data.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title="No hay rendiciones esperando auditoría"
          description="Cuando un responsable presente una rendición, aparecerá acá."
        />
      )}

      {data && data.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {data.length === 1
              ? '1 rendición esperando auditoría'
              : `${data.length} rendiciones esperando auditoría`}{' '}
            {grupos.length === 1
              ? 'en 1 organismo'
              : `en ${grupos.length} organismos`}
          </p>
          <ul className="space-y-4">
            {grupos.map((grupo) => (
              <GrupoOrganismoPendiente
                key={grupo.organismoId}
                grupo={grupo}
                // con un solo organismo no hay nada que elegir: se muestra abierto
                abiertoInicialmente={grupos.length === 1}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
