import { UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganismosActivos } from '@/features/organismos/hooks/useOrganismos';
import { useResponsablesSinOrganismo } from '../hooks/useResponsablesSinOrganismo';
import { ResponsablePendienteCard } from './ResponsablePendienteCard';

export function ResponsablesPage() {
  const responsables = useResponsablesSinOrganismo();
  const organismos = useOrganismosActivos();

  const organismosActivos = organismos.data ?? [];
  const sinOrganismosActivos =
    organismos.isSuccess && organismosActivos.length === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Vinculación de Responsables"
        description="Asigne el organismo correspondiente a los nuevos responsables registrados."
      />

      {responsables.isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {responsables.isError && (
        <ErrorAlert
          error={responsables.error}
          onRetry={() => responsables.refetch()}
          retrying={responsables.isRefetching}
        />
      )}

      {responsables.data && responsables.data.length === 0 && (
        <EmptyState
          icon={UserCheck}
          title="No hay responsables pendientes de asignación"
          description="Los nuevos responsables aparecerán aquí hasta que se les asigne un organismo."
        />
      )}

      {responsables.data && responsables.data.length > 0 && (
        <section className="space-y-4">
          {sinOrganismosActivos && (
            <p
              role="status"
              className="rounded-lg border border-warning-border bg-warning-subtle p-3 text-sm text-warning"
            >
              No hay organismos activos disponibles.{' '}
              <Link to="/organismos" className="font-medium underline">
                Registre uno en Organismos
              </Link>{' '}
              para poder asignarlo.
            </p>
          )}
          {organismos.isError && (
            <ErrorAlert
              error={organismos.error}
              onRetry={() => organismos.refetch()}
              retrying={organismos.isRefetching}
            />
          )}
          <p className="text-sm text-muted-foreground">
            {responsables.data.length === 1
              ? '1 responsable pendiente'
              : `${responsables.data.length} responsables pendientes`}
          </p>
          <ul className="space-y-4">
            {responsables.data.map((responsable) => (
              <ResponsablePendienteCard
                key={responsable.id}
                responsable={responsable}
                organismos={organismosActivos}
                cargandoOrganismos={organismos.isPending}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
