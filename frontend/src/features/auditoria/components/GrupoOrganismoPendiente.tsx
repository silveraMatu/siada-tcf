import { useState } from 'react';

import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { GrupoOrganismo } from '../lib/agrupar-por-organismo';
import { RendicionPendiente } from './RendicionPendiente';

interface GrupoOrganismoPendienteProps {
  grupo: GrupoOrganismo;
  /** Cerrado por defecto: el encabezado ya dice cuántas rendiciones y libros esconde. */
  abiertoInicialmente?: boolean;
  /** «2 rendiciones pendientes»: cómo se nombra la cantidad de rendiciones de la pestaña. */
  describirRendiciones?: (cantidad: number) => string;
}

const describirPendientes = (cantidad: number) =>
  cantidad === 1
    ? '1 rendición pendiente'
    : `${cantidad} rendiciones pendientes`;

/** Un organismo con todas sus rendiciones pendientes, desplegable para no repetir ni amontonar el contenido. */
export function GrupoOrganismoPendiente({
  grupo,
  abiertoInicialmente = false,
  describirRendiciones = describirPendientes,
}: GrupoOrganismoPendienteProps) {
  const [abierto, setAbierto] = useState(abiertoInicialmente);
  const idTitulo = `organismo-${grupo.organismoId}`;
  const rendiciones = grupo.rendiciones.length;
  const libros = grupo.rendiciones.reduce(
    (total, cuenta) => total + cuenta.libros.length,
    0,
  );

  return (
    <li>
      <Card className="overflow-hidden shadow-sm">
        <section aria-labelledby={idTitulo}>
          <Collapsible open={abierto} onOpenChange={setAbierto}>
            <header className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-muted/30 px-6 py-4 transition-colors hover:bg-muted/50">
              <h2
                id={idTitulo}
                className="text-lg font-semibold leading-snug tracking-tight"
              >
                <CollapsibleTrigger cubreEncabezado>
                  {grupo.organismoNombre}
                </CollapsibleTrigger>
              </h2>
              <p className="text-sm text-muted-foreground">
                {describirRendiciones(rendiciones)} ·{' '}
                {libros === 1 ? '1 libro' : `${libros} libros`}
              </p>
            </header>
            <CollapsibleContent>
              <ul className="divide-y border-t">
                {grupo.rendiciones.map((cuenta) => (
                  <RendicionPendiente key={cuenta.id} cuenta={cuenta} />
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </section>
      </Card>
    </li>
  );
}
