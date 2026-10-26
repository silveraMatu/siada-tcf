import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { EstadoBadge } from '@/features/cuentas/components/EstadoBadge';
import { MESES } from '@/features/cuentas/constants';
import type { CuentaMensualListada } from '@/features/cuentas/types';
import { LibrosDeRendicion } from '@/features/libro-banco/components/LibrosDeRendicion';
import { describirLibrosCargados } from '@/features/libro-banco/lib/formato-libro';

/** Qué ofrece el botón según hasta dónde llegó el auditor con esa rendición. */
function accionDe(estado: string): string {
  if (estado === 'LISTO_PARA_AUDITAR') return 'Auditar Rendición';
  if (estado === 'EN_AUDITORIA') return 'Continuar auditoría';
  return 'Ver auditoría';
}

/**
 * Una rendición pendiente (organismo + mes), desplegable: cerrada muestra el período y cuántos
 * libros trae; abierta, el resumen de cada uno y, al clicar su nombre, sus transacciones en una
 * pestaña. El botón para auditarla está siempre a la vista.
 */
export function RendicionPendiente({
  cuenta,
}: {
  cuenta: CuentaMensualListada;
}) {
  const [abierta, setAbierta] = useState(false);
  const periodo = `${MESES[cuenta.mes - 1]} ${cuenta.ejercicioFiscal}`;
  const accion = accionDe(cuenta.estado);
  // las pendientes son todas «Listo para auditar»: solo las demás necesitan decir en qué estado están
  const mostrarEstado = cuenta.estado !== 'LISTO_PARA_AUDITAR';

  return (
    <li>
      <Collapsible open={abierta} onOpenChange={setAbierta}>
        <div className="relative flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-0.5">
            <h3 className="font-semibold tracking-tight">
              <CollapsibleTrigger cubreEncabezado>{periodo}</CollapsibleTrigger>
            </h3>
            {/* alineado con el título, que lleva el chevron a la izquierda */}
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6 text-sm text-muted-foreground">
              {describirLibrosCargados(cuenta.libros.length)}
              {mostrarEstado && <EstadoBadge estado={cuenta.estado} />}
            </p>
          </div>
          {/* por encima del área clicable del encabezado, para que siga siendo un botón aparte */}
          <Button asChild className="relative z-10 w-full sm:w-auto">
            <Link
              to={`/auditoria/cuenta/${cuenta.id}`}
              aria-label={`${accion} de ${cuenta.organismoNombre}, ${periodo}`}
            >
              {accion}
              <ArrowRight />
            </Link>
          </Button>
        </div>

        <CollapsibleContent>
          <div className="pb-6 pl-12 pr-6">
            {cuenta.libros.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Esta rendición no tiene libros cargados.
              </p>
            ) : (
              <LibrosDeRendicion
                cuentaMensualId={cuenta.id}
                libros={cuenta.libros}
                etiqueta={`Libros de ${periodo}`}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
