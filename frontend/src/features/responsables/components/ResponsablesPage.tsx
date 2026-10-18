import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganismosActivos } from '@/features/organismos/hooks/useOrganismos';
import { useResponsablesSinOrganismo } from '../hooks/useResponsablesSinOrganismo';
import { ResponsablePendienteCard } from './ResponsablePendienteCard';

export function ResponsablesPage() {
  const responsables = useResponsablesSinOrganismo();
  const organismos = useOrganismosActivos();

  const organismosActivos = organismos.data ?? [];
  const sinOrganismosActivos = organismos.isSuccess && organismosActivos.length === 0;

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
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
            <Check className="size-6 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">
              No hay responsables pendientes de asignación
            </p>
            <p className="text-sm text-muted-foreground">
              Los nuevos responsables aparecerán aquí hasta que se les asigne un
              organismo.
            </p>
          </div>
        </div>
      )}

      {responsables.data && responsables.data.length > 0 && (
        <section className="space-y-3">
          {sinOrganismosActivos && (
            <p
              role="status"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
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
          <ul className="space-y-3">
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
