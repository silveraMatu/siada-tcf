import { ArrowLeft, SearchX } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { MESES } from '@/features/cuentas/constants';
import { EstadoBadge } from '@/features/cuentas/components/EstadoBadge';
import { useCuentasMensuales } from '@/features/cuentas/hooks/useCuentasMensuales';
import {
  LibrosDeRendicion,
  type FocoLibro,
} from '@/features/libro-banco/components/LibrosDeRendicion';
import {
  describirLibrosCargados,
  describirTransacciones,
} from '@/features/libro-banco/lib/formato-libro';
import type { ObservacionUbicada } from '../types/auditoria.types';
import { PanelAuditoria } from './PanelAuditoria';

const volver = (
  <Link
    to="/auditoria"
    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
  >
    <ArrowLeft className="size-4" aria-hidden />
    Volver a las rendiciones pendientes
  </Link>
);

/**
 * Revisión de una rendición: arriba las validaciones determinísticas, abajo los libros que se
 * presentaron. Desde una observación se llega a la fila del libro donde se detectó.
 */
export function AuditarCuentaPage() {
  const { id } = useParams();
  const cuentaId = Number(id);
  const { data, isPending, isError, error, refetch, isFetching } =
    useCuentasMensuales();
  const [foco, setFoco] = useState<FocoLibro | undefined>();

  const cuenta = data?.find((candidata) => candidata.id === cuentaId);

  function verEnLibro(observacion: ObservacionUbicada) {
    if (observacion.libroId === undefined || observacion.transaccionId === null)
      return;
    setFoco({
      libroId: observacion.libroId,
      transaccionId: observacion.transaccionId,
      clave: Date.now(),
    });
  }

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        {volver}
        <Skeleton className="h-16 w-full max-w-md rounded-lg" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {volver}
        <ErrorAlert
          error={error}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </div>
    );
  }

  if (!cuenta) {
    return (
      <div className="space-y-6">
        {volver}
        <EmptyState
          icon={SearchX}
          title="No se encontró la rendición"
          description="Puede que el enlace sea incorrecto o que la rendición ya no exista. Vuelva al listado para elegir otra."
        />
      </div>
    );
  }

  const periodo = `${MESES[cuenta.mes - 1]} ${cuenta.ejercicioFiscal}`;
  const transacciones = cuenta.libros.reduce(
    (total, libro) => total + libro.cantidadTransacciones,
    0,
  );

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        {volver}
        <PageHeader
          title="Auditar rendición"
          description={`${cuenta.organismoNombre} · ${periodo}`}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <EstadoBadge estado={cuenta.estado} />
          <span>
            {describirLibrosCargados(cuenta.libros.length)} ·{' '}
            {describirTransacciones(transacciones)}
          </span>
        </div>
      </div>

      <PanelAuditoria
        cuentaMensualId={cuenta.id}
        onVerEnLibro={verEnLibro}
      />

      <section aria-labelledby="libros-titulo" className="space-y-3">
        <h2 id="libros-titulo" className="text-lg font-semibold tracking-tight">
          Libros de la rendición
        </h2>
        {cuenta.libros.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta rendición no tiene libros cargados.
          </p>
        ) : (
          <LibrosDeRendicion
            cuentaMensualId={cuenta.id}
            libros={cuenta.libros}
            etiqueta={`Libros de ${periodo}`}
            foco={foco}
          />
        )}
      </section>
    </div>
  );
}
