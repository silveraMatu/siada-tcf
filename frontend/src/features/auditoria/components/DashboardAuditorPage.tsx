import { ClipboardCheck } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/features/auth/hooks/useAuth';
import { useCuentasMensuales } from '@/features/cuentas/hooks/useCuentasMensuales';
import type { CuentaMensualListada } from '@/features/cuentas/types';
import { agruparPorOrganismo } from '../lib/agrupar-por-organismo';
import { clasificarCuentas } from '../lib/clasificar-cuentas';
import { GrupoOrganismoPendiente } from './GrupoOrganismoPendiente';

type Pestana = 'para-auditar' | 'en-curso' | 'cerradas';

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

interface PestanaInfo {
  valor: Pestana;
  titulo: string;
  vacio: { titulo: string; descripcion: string };
  /** «3 rendiciones esperando auditoría en 2 organismos» */
  resumen: (rendiciones: number, organismos: number) => string;
  /** Cómo se nombra la cantidad de rendiciones de cada organismo. */
  rendiciones: (cantidad: number) => string;
}

const PESTANAS: readonly PestanaInfo[] = [
  {
    valor: 'para-auditar',
    titulo: 'Para auditar',
    vacio: {
      titulo: 'No hay rendiciones esperando auditoría',
      descripcion:
        'Cuando un responsable presente una rendición, aparecerá acá.',
    },
    resumen: (n, o) =>
      `${plural(n, 'rendición esperando auditoría', 'rendiciones esperando auditoría')} ${o === 1 ? 'en 1 organismo' : `en ${o} organismos`}`,
    rendiciones: (n) =>
      plural(n, 'rendición pendiente', 'rendiciones pendientes'),
  },
  {
    valor: 'en-curso',
    titulo: 'En curso',
    vacio: {
      titulo: 'No hay auditorías en curso',
      descripcion:
        'Al auditar una rendición, queda acá hasta que cierre la auditoría.',
    },
    resumen: (n, o) =>
      `${plural(n, 'auditoría en curso', 'auditorías en curso')} ${o === 1 ? 'en 1 organismo' : `en ${o} organismos`}`,
    rendiciones: (n) => plural(n, 'rendición en curso', 'rendiciones en curso'),
  },
  {
    valor: 'cerradas',
    titulo: 'Cerradas',
    vacio: {
      titulo: 'Todavía no cerró ninguna auditoría',
      descripcion: 'Las rendiciones cuya auditoría cierre aparecerán acá.',
    },
    resumen: (n, o) =>
      `${plural(n, 'auditoría cerrada', 'auditorías cerradas')} ${o === 1 ? 'en 1 organismo' : `en ${o} organismos`}`,
    rendiciones: (n) => plural(n, 'rendición cerrada', 'rendiciones cerradas'),
  },
];

function ListaPorOrganismo({
  info,
  cuentas,
}: {
  info: PestanaInfo;
  cuentas: CuentaMensualListada[];
}) {
  const grupos = agruparPorOrganismo(cuentas);

  if (cuentas.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={info.vacio.titulo}
        description={info.vacio.descripcion}
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {info.resumen(cuentas.length, grupos.length)}
      </p>
      <ul className="space-y-4">
        {grupos.map((grupo) => (
          <GrupoOrganismoPendiente
            key={grupo.organismoId}
            grupo={grupo}
            // con un solo organismo no hay nada que elegir: se muestra abierto
            abiertoInicialmente={grupos.length === 1}
            describirRendiciones={info.rendiciones}
          />
        ))}
      </ul>
    </div>
  );
}

/**
 * Las rendiciones del auditor por estado: las que esperan auditoría, las que tiene en curso y las que
 * ya cerró. Un auditor solo recibe las de los organismos que el juez de trámite le asignó.
 */
export function DashboardAuditorPage() {
  const { data, isPending, isError, error, refetch, isFetching } =
    useCuentasMensuales();
  const esAdmin = useAuthStore((s) => s.user?.roles.includes('ADMIN') ?? false);
  const [elegida, setElegida] = useState<Pestana | null>(null);

  const clasificadas = data ? clasificarCuentas(data) : null;
  const cuentasDe: Record<Pestana, CuentaMensualListada[]> = {
    'para-auditar': clasificadas?.paraAuditar ?? [],
    'en-curso': clasificadas?.enCurso ?? [],
    cerradas: clasificadas?.cerradas ?? [],
  };
  const total =
    cuentasDe['para-auditar'].length +
    cuentasDe['en-curso'].length +
    cuentasDe.cerradas.length;
  // arranca en la primera pestaña que tenga algo, para no mostrar un vacío si hay trabajo en otra
  const activa: Pestana =
    elegida ??
    PESTANAS.find((p) => cuentasDe[p.valor].length > 0)?.valor ??
    'para-auditar';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rendiciones para auditar"
        description={
          esAdmin
            ? 'Rendiciones mensuales presentadas por los organismos, según su estado de auditoría.'
            : 'Rendiciones presentadas por los organismos que tiene asignados, según su estado de auditoría.'
        }
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

      {data && total === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title="No hay rendiciones para auditar"
          description={
            esAdmin
              ? 'Cuando un responsable presente una rendición, aparecerá acá.'
              : 'Solo ve las rendiciones de los organismos que le asignó el juez de trámite. Si todavía no tiene ninguno, pídale que se lo asigne.'
          }
        />
      )}

      {data && total > 0 && (
        <Tabs
          value={activa}
          onValueChange={(valor) => setElegida(valor as Pestana)}
          className="space-y-4"
        >
          <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1">
            {PESTANAS.map((p) => (
              <TabsTrigger key={p.valor} value={p.valor}>
                {p.titulo}
                <span className="ml-2 min-w-5 rounded-full bg-muted px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-muted-foreground">
                  {cuentasDe[p.valor].length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {PESTANAS.map((p) => (
            <TabsContent key={p.valor} value={p.valor} className="mt-0">
              <ListaPorOrganismo info={p} cuentas={cuentasDe[p.valor]} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
