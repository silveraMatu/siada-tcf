import { ChevronRight } from 'lucide-react';
import { Fragment, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { etiquetaDeAccion, etiquetaDeEntidad } from '../constants';
import type { EventoActividad } from '../types';
import { ResultadoBadge } from './ResultadoBadge';

const formatoMomento = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

/** Quién hizo la acción; un login fallido no identificó a nadie, pero deja el email que se probó. */
function Usuario({ evento }: { evento: EventoActividad }) {
  if (evento.nombre) {
    return (
      <div className="min-w-0">
        <p className="font-medium">
          {evento.apellido}, {evento.nombre}
        </p>
        {evento.dni && (
          <p className="font-mono text-xs text-muted-foreground">
            DNI {evento.dni}
          </p>
        )}
      </div>
    );
  }
  const email =
    typeof evento.detalle?.email === 'string' ? evento.detalle.email : null;
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">Sin identificar</p>
      {email && (
        <p className="break-all text-xs text-muted-foreground">{email}</p>
      )}
    </div>
  );
}

function Dato({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{titulo}</dt>
      <dd className="break-words text-sm">{children}</dd>
    </div>
  );
}

function DetalleEvento({ evento }: { evento: EventoActividad }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      <Dato titulo="Código HTTP">{evento.codigoHttp}</Dato>
      <Dato titulo="Roles">
        {evento.roles.length > 0 ? evento.roles.join(', ') : '—'}
      </Dato>
      <Dato titulo="IP">{evento.ip ?? '—'}</Dato>
      <Dato titulo="Organismo">
        {evento.organismoId !== null ? `#${evento.organismoId}` : '—'}
      </Dato>
      <Dato titulo="Rendición">
        {evento.cuentaMensualId !== null ? `#${evento.cuentaMensualId}` : '—'}
      </Dato>
      <Dato titulo="Request id">
        <span className="font-mono text-xs">{evento.requestId ?? '—'}</span>
      </Dato>
      <div className="sm:col-span-2 lg:col-span-3">
        <Dato titulo="Navegador">{evento.userAgent ?? '—'}</Dato>
      </div>
      {evento.detalle && (
        <div className="sm:col-span-2 lg:col-span-3">
          <Dato titulo="Detalle">
            <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
              {JSON.stringify(evento.detalle, null, 2)}
            </pre>
          </Dato>
        </div>
      )}
    </dl>
  );
}

/** Los eventos más nuevos primero; cada fila se despliega para ver el detalle técnico. */
export function TablaActividad({ eventos }: { eventos: EventoActividad[] }) {
  const [abiertos, setAbiertos] = useState<ReadonlySet<number>>(new Set());

  function alternar(id: number) {
    setAbiertos((actuales) => {
      const siguientes = new Set(actuales);
      if (!siguientes.delete(id)) siguientes.add(id);
      return siguientes;
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <span className="sr-only">Detalle</span>
            </TableHead>
            <TableHead>Fecha y hora</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Acción</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Entidad</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {eventos.map((evento) => {
            const abierto = abiertos.has(evento.id);
            const idDetalle = `evento-${evento.id}`;
            return (
              <Fragment key={evento.id}>
                <TableRow className={cn(abierto && 'border-b-0')}>
                  <TableCell className="pr-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      aria-expanded={abierto}
                      aria-controls={idDetalle}
                      aria-label={`${abierto ? 'Ocultar' : 'Ver'} el detalle del evento ${evento.id}`}
                      onClick={() => alternar(evento.id)}
                    >
                      <ChevronRight
                        className={cn(
                          'motion-safe:transition-transform',
                          abierto && 'rotate-90',
                        )}
                      />
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {formatoMomento.format(new Date(evento.ocurridoEn))}
                  </TableCell>
                  <TableCell>
                    <Usuario evento={evento} />
                  </TableCell>
                  <TableCell>{etiquetaDeAccion(evento.accion)}</TableCell>
                  <TableCell>
                    <ResultadoBadge resultado={evento.resultado} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {evento.entidadTipo
                      ? `${etiquetaDeEntidad(evento.entidadTipo)}${evento.entidadId !== null ? ` #${evento.entidadId}` : ''}`
                      : '—'}
                  </TableCell>
                </TableRow>
                {abierto && (
                  <TableRow
                    id={idDetalle}
                    className="bg-muted/40 hover:bg-muted/40"
                  >
                    <TableCell />
                    <TableCell colSpan={5} className="py-4">
                      <DetalleEvento evento={evento} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
