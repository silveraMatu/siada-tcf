import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Crosshair,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  contarResultado,
  librosFaltantes,
  nombreDeLibroFaltante,
  type LibroParaContar,
} from '../lib/contar-resultado';
import type {
  EstadoValidacion,
  ObservacionUbicada,
  ResultadoValidacion,
} from '../types/auditoria.types';

interface Presentacion {
  etiqueta: string;
  icono: LucideIcon;
  /** Color del ícono de estado. */
  tonoIcono: string;
  /** Borde y fondo de la tarjeta. */
  tarjeta: string;
}

const PRESENTACION: Record<EstadoValidacion, Presentacion> = {
  VERIFICADO: {
    etiqueta: 'Verificada',
    icono: CheckCircle2,
    tonoIcono: 'text-success',
    tarjeta: 'border-success-border',
  },
  FALLO: {
    etiqueta: 'Con observaciones',
    icono: AlertTriangle,
    tonoIcono: 'text-danger',
    tarjeta: 'border-danger-border bg-danger-subtle/60',
  },
  FALTAN_LIBROS: {
    etiqueta: 'Omitida: faltan libros',
    icono: Clock,
    tonoIcono: 'text-muted-foreground',
    tarjeta: 'bg-muted text-muted-foreground',
  },
};

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

function Contador({
  icono: Icono,
  valor,
  etiqueta,
  tono,
}: {
  icono: LucideIcon;
  valor: number | null;
  etiqueta: string;
  tono: string;
}) {
  const activo = valor !== null && valor > 0;
  return (
    <li
      className={cn(
        'flex min-w-12 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-sm font-medium tabular-nums',
        activo ? tono : 'border-transparent text-muted-foreground',
      )}
    >
      <Icono aria-hidden className="size-3.5" />
      <span aria-hidden>{valor ?? '—'}</span>
      <span className="sr-only">{etiqueta}</span>
    </li>
  );
}

interface ReglaValidacionCardProps {
  resultado: ResultadoValidacion;
  /** Resumen de los libros de la rendición, para saber cuántas filas recorrió la regla. */
  libros: readonly LibroParaContar[];
  /** Las observaciones de la regla con su libro y fila (solo importan si falló). */
  observaciones: readonly ObservacionUbicada[];
  /** Los libros todavía se están trayendo, así que la fila no se puede indicar aún. */
  ubicando?: boolean;
  onVerEnLibro: (observacion: ObservacionUbicada) => void;
}

/**
 * Una regla del motor, plegada por defecto: nombre, código y tres contadores (✗ filas con observación,
 * ✓ filas verificadas, ⏱ libros que faltan). Al abrirla muestra el detalle según cómo terminó.
 */
export function ReglaValidacionCard({
  resultado,
  libros,
  observaciones,
  ubicando = false,
  onVerEnLibro,
}: ReglaValidacionCardProps) {
  const [abierta, setAbierta] = useState(false);
  const presentacion =
    PRESENTACION[resultado.estado] ?? PRESENTACION.FALTAN_LIBROS;
  const Icono = presentacion.icono;
  const contadores = contarResultado(resultado, libros);
  const idTitulo = `regla-${resultado.codigoRegla}`;

  return (
    <li>
      <Card className={cn('overflow-hidden shadow-sm', presentacion.tarjeta)}>
        <section aria-labelledby={idTitulo}>
          <Collapsible open={abierta} onOpenChange={setAbierta}>
            <header className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-foreground/5 sm:px-6">
              <h3 id={idTitulo} className="min-w-0 text-base font-semibold">
                <CollapsibleTrigger cubreEncabezado>
                  <Icono
                    aria-hidden
                    className={cn('size-5 shrink-0', presentacion.tonoIcono)}
                  />
                  <span className="min-w-0">{resultado.descripcion}</span>
                  <Badge
                    variant="outline"
                    className="rounded-md font-mono font-medium"
                  >
                    {resultado.codigoRegla}
                  </Badge>
                  <span className="sr-only">: {presentacion.etiqueta}</span>
                </CollapsibleTrigger>
              </h3>
              <ul
                aria-label="Resultado de la regla"
                className="flex items-center gap-1.5 pl-6 sm:pl-0"
              >
                <Contador
                  icono={X}
                  valor={contadores.falladas}
                  etiqueta={plural(
                    contadores.falladas,
                    'fila con observaciones',
                    'filas con observaciones',
                  )}
                  tono="border-danger-border bg-danger-subtle text-danger"
                />
                <Contador
                  icono={Check}
                  valor={contadores.verificadas}
                  etiqueta={
                    contadores.verificadas === null
                      ? 'Filas verificadas: dato no disponible'
                      : plural(
                          contadores.verificadas,
                          'fila verificada',
                          'filas verificadas',
                        )
                  }
                  tono="border-success-border bg-success-subtle text-success"
                />
                <Contador
                  icono={Clock}
                  valor={contadores.librosFaltantes}
                  etiqueta={plural(
                    contadores.librosFaltantes,
                    'libro faltante',
                    'libros faltantes',
                  )}
                  tono="border-border bg-background text-foreground"
                />
              </ul>
            </header>

            <CollapsibleContent>
              <div className="border-t px-3 py-3 sm:px-6 sm:py-4">
                <DetalleRegla
                  resultado={resultado}
                  contadoresVerificadas={contadores.verificadas}
                  observaciones={observaciones}
                  ubicando={ubicando}
                  onVerEnLibro={onVerEnLibro}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>
      </Card>
    </li>
  );
}

function DetalleRegla({
  resultado,
  contadoresVerificadas,
  observaciones,
  ubicando,
  onVerEnLibro,
}: {
  resultado: ResultadoValidacion;
  contadoresVerificadas: number | null;
  observaciones: readonly ObservacionUbicada[];
  ubicando: boolean;
  onVerEnLibro: (observacion: ObservacionUbicada) => void;
}) {
  if (resultado.estado === 'VERIFICADO') {
    return (
      <p className="text-sm text-foreground">
        {contadoresVerificadas === null
          ? 'La regla se ejecutó y no encontró diferencias.'
          : `Se evaluaron ${plural(contadoresVerificadas, 'fila', 'filas')} y no se encontraron diferencias.`}
      </p>
    );
  }

  if (resultado.estado === 'FALTAN_LIBROS') {
    const faltantes = librosFaltantes(resultado.mensaje).map(
      nombreDeLibroFaltante,
    );
    return (
      <p className="text-sm">
        {faltantes.length > 0
          ? `No se pudo evaluar esta regla porque ${faltantes.length === 1 ? 'falta' : 'faltan'}: ${faltantes.join(', ')}. Necesita ${faltantes.length === 1 ? 'ese libro' : 'esos libros'} para poder correr.`
          : (resultado.mensaje ??
            'No se pudo evaluar esta regla porque faltan libros.')}
      </p>
    );
  }

  return (
    <div className="max-h-96 overflow-auto rounded-lg border bg-card text-card-foreground">
      <Table>
        <TableCaption className="sr-only">
          Observaciones de la regla {resultado.codigoRegla}
        </TableCaption>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-16 text-right">Fila</TableHead>
            <TableHead>Libro</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead className="w-px">
              <span className="sr-only">Acciones</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {observaciones.map((observacion) => {
            const ubicada =
              observacion.libroId !== undefined &&
              observacion.transaccionId !== null;
            return (
              <TableRow key={observacion.id}>
                <TableCell className="text-right font-medium tabular-nums">
                  {ubicando && observacion.transaccionId !== null ? (
                    <Skeleton className="ml-auto h-4 w-6" />
                  ) : (
                    (observacion.fila ?? '—')
                  )}
                </TableCell>
                <TableCell className="max-w-28 break-words sm:max-w-none sm:whitespace-nowrap">
                  {observacion.libroNombre ?? '—'}
                </TableCell>
                <TableCell className="min-w-40 sm:min-w-64">
                  {observacion.mensaje}
                </TableCell>
                <TableCell className="text-right">
                  {ubicada && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onVerEnLibro(observacion)}
                      aria-label={`Ver la fila ${observacion.fila} de ${observacion.libroNombre} en el libro`}
                    >
                      <Crosshair />
                      <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                        Ver en el libro
                      </span>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
