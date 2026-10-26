import { Lock, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Skeleton } from '@/components/ui/skeleton';
import { useIngresosEgresos } from '@/features/ingresos-egresos/hooks/useIngresosEgresos';
import { useLibrosBanco } from '@/features/libro-banco/hooks/useLibrosBanco';
import { useEjecucion } from '../hooks/useEjecucion';
import {
  filtrarPorEstado,
  ordenarPorCodigo,
  resumirResultados,
} from '../lib/resumir-resultados';
import { ubicarObservaciones } from '../lib/ubicar-observaciones';
import type {
  EstadoValidacion,
  ObservacionUbicada,
} from '../types/auditoria.types';
import { AuditarDialog } from './AuditarDialog';
import { CierreAuditoria } from './CierreAuditoria';
import { ReglaValidacionCard } from './ReglaValidacionCard';
import { ScorecardValidaciones } from './ScorecardValidaciones';
import { Button } from '@/components/ui/button';

const formatoMomento = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const NOMBRE_FILTRO: Record<EstadoValidacion, string> = {
  VERIFICADO: 'verificadas',
  FALLO: 'fallidas',
  FALTAN_LIBROS: 'omitidas',
};

const CLAVE_RESUMEN = {
  VERIFICADO: 'verificadas',
  FALLO: 'fallidas',
  FALTAN_LIBROS: 'omitidas',
} as const;

interface PanelAuditoriaProps {
  cuentaMensualId: number;
  /** Estado de la rendición: decide si todavía se puede auditar. */
  estadoCuenta: string;
  onVerEnLibro: (observacion: ObservacionUbicada) => void;
}

/**
 * Validaciones determinísticas de la rendición. El resultado lo guarda el servidor: se carga al abrir la
 * pantalla y, si todavía no se auditó, el auditor lo pide con «Auditar rendición». Cada regla se despliega
 * para ver su detalle.
 */
export function PanelAuditoria({
  cuentaMensualId,
  estadoCuenta,
  onVerEnLibro,
}: PanelAuditoriaProps) {
  const ejecucionConsulta = useEjecucion(cuentaMensualId);
  const ejecucion = ejecucionConsulta.data ?? null;
  const [filtro, setFiltro] = useState<EstadoValidacion | null>(null);
  const [anuncio, setAnuncio] = useState('');

  const resultados = ejecucion?.resultados;
  const hayFallos = resultados?.some((r) => r.estado === 'FALLO') ?? false;
  // las filas solo hacen falta para ubicar las observaciones, así que se piden recién si hay alguna
  const librosGuardados = useLibrosBanco(cuentaMensualId, {
    enabled: hayFallos,
  });
  const ingresosEgresos = useIngresosEgresos(cuentaMensualId, {
    enabled: hayFallos,
  });
  const ubicando =
    hayFallos && (librosGuardados.isPending || ingresosEgresos.isPending);

  const resumen = useMemo(
    () => (resultados ? resumirResultados(resultados) : null),
    [resultados],
  );
  // un filtro sin reglas (p. ej. tras actualizar el resultado) no deja la lista vacía
  const filtroVigente =
    filtro && resumen && resumen[CLAVE_RESUMEN[filtro]] > 0 ? filtro : null;
  const visibles = useMemo(
    () =>
      resultados
        ? ordenarPorCodigo(filtrarPorEstado(resultados, filtroVigente))
        : [],
    [resultados, filtroVigente],
  );

  // se revisa mientras la rendición está en auditoría y la ejecución no se cerró
  const enCurso =
    estadoCuenta === 'EN_AUDITORIA' && ejecucion?.cerradaEn === null;
  const sinAuditar = !ejecucionConsulta.isPending && ejecucion === null;
  const puedeAuditar = sinAuditar && estadoCuenta === 'LISTO_PARA_AUDITAR';

  return (
    <section aria-labelledby="validaciones-titulo" className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2
            id="validaciones-titulo"
            className="text-lg font-semibold tracking-tight"
          >
            Validaciones determinísticas
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            Reglas automáticas del motor de auditoría. Cada hallazgo indica la
            regla, el libro y la fila de donde sale.
          </p>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          {puedeAuditar && (
            <AuditarDialog
              cuentaMensualId={cuentaMensualId}
              onAuditada={() =>
                setAnuncio(
                  'Rendición auditada: ya puede revisar los resultados.',
                )
              }
            />
          )}
          {ejecucion && (
            <p className="text-xs text-muted-foreground sm:text-right">
              Auditada el{' '}
              {formatoMomento.format(new Date(ejecucion.ejecutadaEn))}
              {ejecucion.ejecutadaPor &&
                ` por ${ejecucion.ejecutadaPor.nombre} ${ejecucion.ejecutadaPor.apellido}`}{' '}
              · reglas v{ejecucion.versionReglas}
            </p>
          )}
        </div>
      </div>

      <p role="status" className="sr-only">
        {anuncio}
      </p>

      <ScorecardValidaciones
        resumen={resumen}
        filtro={filtroVigente}
        onFiltrar={setFiltro}
      />

      {ejecucionConsulta.isPending && (
        <div aria-busy="true" className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {ejecucionConsulta.isError && (
        <ErrorAlert
          error={ejecucionConsulta.error}
          onRetry={() => void ejecucionConsulta.refetch()}
          retrying={ejecucionConsulta.isFetching}
        />
      )}

      {sinAuditar && puedeAuditar && (
        <EmptyState
          icon={ListChecks}
          title="Todavía no se auditó esta rendición"
          description="Al auditarla, el motor verifica sus libros y deja guardado qué verificó, qué encontró y qué no pudo evaluar. Nada se ejecuta solo."
        />
      )}

      {sinAuditar && !puedeAuditar && (
        <EmptyState
          icon={estadoCuenta === 'EN_BORRADOR' ? Lock : ListChecks}
          title={
            estadoCuenta === 'EN_BORRADOR'
              ? 'Todavía no fue presentada'
              : 'Esta rendición no tiene una auditoría guardada'
          }
          description={
            estadoCuenta === 'EN_BORRADOR'
              ? 'El responsable la está armando: no se puede auditar hasta que la presente.'
              : 'No hay un resultado del motor para mostrar.'
          }
        />
      )}

      {resultados && resultados.length === 0 && (
        <EmptyState
          icon={ListChecks}
          title="El motor no devolvió reglas"
          description="No hay reglas disponibles para esta rendición."
        />
      )}

      {resultados && resultados.length > 0 && (
        <div className="space-y-3">
          {filtroVigente && (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              Mostrando solo las reglas {NOMBRE_FILTRO[filtroVigente]}.
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setFiltro(null)}
              >
                Quitar filtro
              </Button>
            </p>
          )}
          <ul className="space-y-3">
            {visibles.map((resultado) => (
              <ReglaValidacionCard
                key={resultado.codigoRegla}
                resultado={resultado}
                observaciones={ubicarObservaciones(resultado.observaciones, {
                  librosBanco: librosGuardados.data,
                  ingresosEgresos: ingresosEgresos.data,
                })}
                ubicando={ubicando}
                puedeRevisar={enCurso}
                cuentaMensualId={cuentaMensualId}
                onVerEnLibro={onVerEnLibro}
              />
            ))}
          </ul>
        </div>
      )}

      {ejecucion && (
        <CierreAuditoria
          cuentaMensualId={cuentaMensualId}
          ejecucion={ejecucion}
          enCurso={enCurso}
        />
      )}
    </section>
  );
}
