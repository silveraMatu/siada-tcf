import { ListChecks, Loader2, Play, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ResumenLibro } from '@/features/cuentas/types';
import { useLibrosBanco } from '@/features/libro-banco/hooks/useLibrosBanco';
import { cn } from '@/lib/utils';
import { useEjecutarValidaciones } from '../hooks/useEjecutarValidaciones';
import { useResultadosValidacion } from '../hooks/useResultadosValidacion';
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
import { ReglaValidacionCard } from './ReglaValidacionCard';
import { ScorecardValidaciones } from './ScorecardValidaciones';

const formatoHora = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
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
  /** Resumen de los libros de la rendición. */
  libros: ResumenLibro[];
  onVerEnLibro: (observacion: ObservacionUbicada) => void;
}

/**
 * Validaciones determinísticas de la rendición: el auditor las ejecuta a pedido y ve de un vistazo
 * cuántas reglas se verificaron, fallaron u omitieron; cada regla se despliega para ver su detalle.
 */
export function PanelAuditoria({
  cuentaMensualId,
  libros,
  onVerEnLibro,
}: PanelAuditoriaProps) {
  const { data: ejecucion } = useResultadosValidacion(cuentaMensualId);
  const ejecutar = useEjecutarValidaciones(cuentaMensualId);
  const [filtro, setFiltro] = useState<EstadoValidacion | null>(null);
  const [anuncio, setAnuncio] = useState('');

  const resultados = ejecucion?.resultados;
  const hayFallos = resultados?.some((r) => r.estado === 'FALLO') ?? false;
  // las filas solo hacen falta para ubicar las observaciones, así que se piden recién si hay alguna
  const librosGuardados = useLibrosBanco(cuentaMensualId, {
    enabled: hayFallos,
  });

  const resumen = useMemo(
    () => (resultados ? resumirResultados(resultados) : null),
    [resultados],
  );
  // un filtro sin reglas (p. ej. tras volver a ejecutar) no deja la lista vacía
  const filtroVigente =
    filtro && resumen && resumen[CLAVE_RESUMEN[filtro]] > 0 ? filtro : null;
  const visibles = useMemo(
    () =>
      resultados
        ? ordenarPorCodigo(filtrarPorEstado(resultados, filtroVigente))
        : [],
    [resultados, filtroVigente],
  );

  function iniciar() {
    setAnuncio('');
    ejecutar.mutate(undefined, {
      onSuccess: (nuevos) => {
        const r = resumirResultados(nuevos);
        setAnuncio(
          `Validaciones completadas: ${r.verificadas} verificadas, ${r.fallidas} fallidas, ${r.omitidas} omitidas.`,
        );
      },
    });
  }

  const ejecutando = ejecutar.isPending;

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
          <Button onClick={iniciar} disabled={ejecutando}>
            {ejecutando ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" />
            ) : ejecucion ? (
              <RotateCcw />
            ) : (
              <Play />
            )}
            {ejecutando
              ? 'Ejecutando…'
              : ejecucion
                ? 'Volver a ejecutar validaciones'
                : 'Ejecutar Validaciones Determinísticas'}
          </Button>
          {ejecucion && (
            <p className="text-xs text-muted-foreground">
              Última ejecución: {formatoHora.format(ejecucion.ejecutadoEn)}
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

      {ejecutar.isError && (
        <ErrorAlert
          error={ejecutar.error}
          onRetry={iniciar}
          retrying={ejecutando}
        />
      )}

      {!resultados && ejecutando && (
        <div aria-busy="true" className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!resultados && !ejecutando && !ejecutar.isError && (
        <EmptyState
          icon={ListChecks}
          title="Todavía no se ejecutaron las validaciones"
          description="Ejecútelas para ver qué verificó el motor, qué encontró y qué no pudo evaluar. Nada se ejecuta solo."
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
        <div
          aria-busy={ejecutando}
          className={cn(
            'space-y-3',
            ejecutando && 'opacity-60 motion-safe:transition-opacity',
          )}
        >
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
                libros={libros}
                observaciones={ubicarObservaciones(
                  resultado.observaciones,
                  librosGuardados.data,
                )}
                ubicando={librosGuardados.isPending && hayFallos}
                onVerEnLibro={onVerEnLibro}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
