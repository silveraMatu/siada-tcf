import { Building2, Bot } from 'lucide-react';
import { useId, useMemo, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { MESES } from '@/features/cuentas/constants';
import { useCuentasMensuales } from '@/features/cuentas/hooks/useCuentasMensuales';
import { ChatCopiloto } from './ChatCopiloto';

/** Valor del selector de rendición cuando la consulta es sobre todo el organismo. */
const TODAS = 'todas';

/**
 * Copiloto de IA para el delegado fiscal: consulta libre sobre un organismo o, si se elige,
 * anclada a una rendición. Los organismos y rendiciones salen de `GET /cuentas-mensuales`, que ya
 * trae solo los asignados al auditor (el listado de organismos es solo de ADMIN y JUEZ_TRAMITE).
 */
export function AsistentePage() {
  const { data, isPending, isError, error, refetch, isFetching } =
    useCuentasMensuales();
  const [organismoElegido, setOrganismoElegido] = useState('');
  const [cuentaElegida, setCuentaElegida] = useState(TODAS);
  const organismoCampo = useId();
  const cuentaCampo = useId();

  const organismos = useMemo(() => {
    const porId = new Map<number, string>();
    for (const cuenta of data ?? []) {
      porId.set(cuenta.organismoId, cuenta.organismoNombre);
    }
    return [...porId]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [data]);

  // con un solo organismo no hay nada que elegir
  const organismoId =
    organismoElegido !== ''
      ? Number(organismoElegido)
      : organismos.length === 1
        ? organismos[0].id
        : undefined;

  const rendiciones = useMemo(
    () =>
      (data ?? [])
        .filter((cuenta) => cuenta.organismoId === organismoId)
        .sort((a, b) => b.ejercicioFiscal - a.ejercicioFiscal || b.mes - a.mes),
    [data, organismoId],
  );

  const cuentaMensualId =
    cuentaElegida !== TODAS &&
    rendiciones.some((r) => String(r.id) === cuentaElegida)
      ? Number(cuentaElegida)
      : undefined;

  function elegirOrganismo(valor: string) {
    setOrganismoElegido(valor);
    setCuentaElegida(TODAS);
  }

  const cabecera = (
    <PageHeader
      title="Copiloto de IA"
      description="Consulte los libros y las observaciones de un organismo. La IA asiste con respaldo visible; la decisión es suya."
    />
  );

  if (isPending) {
    return (
      <div className="space-y-6" aria-busy="true">
        {cabecera}
        <Skeleton className="h-16 w-full max-w-xl rounded-lg" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {cabecera}
        <ErrorAlert
          error={error}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      </div>
    );
  }

  if (organismos.length === 0) {
    return (
      <div className="space-y-6">
        {cabecera}
        <EmptyState
          icon={Building2}
          title="Todavía no hay organismos para consultar"
          description="El copiloto trabaja sobre las rendiciones de los organismos que tiene asignados. Cuando le asignen uno con rendiciones presentadas, podrá consultarlo desde acá."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cabecera}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={organismoCampo}>Organismo</Label>
          <Select
            value={organismoId === undefined ? '' : String(organismoId)}
            onValueChange={elegirOrganismo}
          >
            <SelectTrigger id={organismoCampo} className="w-full">
              <SelectValue placeholder="Seleccione un organismo" />
            </SelectTrigger>
            <SelectContent>
              {organismos.map((organismo) => (
                <SelectItem key={organismo.id} value={String(organismo.id)}>
                  {organismo.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={cuentaCampo}>Rendición (opcional)</Label>
          <Select
            value={
              cuentaMensualId === undefined ? TODAS : String(cuentaMensualId)
            }
            onValueChange={setCuentaElegida}
            disabled={organismoId === undefined}
          >
            <SelectTrigger id={cuentaCampo} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAS}>Todo el organismo</SelectItem>
              {rendiciones.map((rendicion) => (
                <SelectItem key={rendicion.id} value={String(rendicion.id)}>
                  {MESES[rendicion.mes - 1]} {rendicion.ejercicioFiscal}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {organismoId === undefined ? (
        <EmptyState
          icon={Bot}
          title="Elija un organismo para empezar"
          description="Tiene más de un organismo asignado: indique sobre cuál quiere consultar."
        />
      ) : (
        <ChatCopiloto
          key={`${organismoId}-${cuentaMensualId ?? TODAS}`}
          organismoId={organismoId}
          cuentaMensualId={cuentaMensualId}
        />
      )}
    </div>
  );
}
