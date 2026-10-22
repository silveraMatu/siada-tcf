import { ClipboardCheck } from 'lucide-react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useCuentasPorEstado } from '@/features/cuentas/hooks/useCuentasPorEstado';
import { RendicionPendienteCard } from './RendicionPendienteCard';

export function DashboardAuditorPage() {
  const { data, isPending, isError, error, refetch, isFetching } =
    useCuentasPorEstado('LISTO_PARA_AUDITAR');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rendiciones pendientes de auditoría"
        description="Rendiciones mensuales que los organismos ya presentaron y esperan su revisión."
      />

      {isPending && (
        <div
          aria-busy="true"
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
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
            {data.length}{' '}
            {data.length === 1
              ? 'rendición esperando auditoría'
              : 'rendiciones esperando auditoría'}
          </p>
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.map((cuenta) => (
              <RendicionPendienteCard key={cuenta.id} cuenta={cuenta} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
