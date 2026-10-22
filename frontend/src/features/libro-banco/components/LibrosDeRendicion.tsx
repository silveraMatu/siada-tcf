import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ResumenLibro } from '@/features/cuentas/types';
import { nombreDeLibro } from '../lib/formato-libro';
import { DetalleLibro } from './DetalleLibro';
import { ResumenLibroFila } from './ResumenLibroFila';

const RESUMEN = 'resumen';
const valorDeLibro = (id: number) => `libro-${id}`;

/** Pedido de abrir un libro y marcar una de sus filas; `clave` cambia en cada pedido. */
export interface FocoLibro {
  libroId: number;
  transaccionId: number;
  clave: number;
}

interface LibrosDeRendicionProps {
  cuentaMensualId: number;
  libros: ResumenLibro[];
  /** Nombre accesible de la lista de resúmenes, por ejemplo «Libros de Abril 2026». */
  etiqueta?: string;
  /** Abre la pestaña de ese libro y marca la fila, cada vez que cambia su `clave`. */
  foco?: FocoLibro;
}

/**
 * Los libros de una rendición en pestañas: «Resumen» lista una fila por libro y, al clicar el nombre de
 * uno, se abre su pestaña con las filas y columnas. Las pestañas abiertas se cierran con «Cerrar».
 */
export function LibrosDeRendicion({
  cuentaMensualId,
  libros,
  etiqueta = 'Libros de la rendición',
  foco,
}: LibrosDeRendicionProps) {
  const [abiertos, setAbiertos] = useState<number[]>([]);
  const [activa, setActiva] = useState(RESUMEN);
  const [claveAtendida, setClaveAtendida] = useState<number | null>(null);
  // La fila a marcar solo vale mientras esa pestaña siga abierta: al reabrirla no se vuelve a ubicar.
  const [filaVigente, setFilaVigente] = useState<FocoLibro | null>(null);

  // Un libro que ya no está (p. ej. se reemplazó y cambió de id) cierra su pestaña.
  const pestanas = abiertos
    .map((id) => libros.find((libro) => libro.id === id))
    .filter((libro): libro is ResumenLibro => libro !== undefined);
  const pestanaVigente =
    activa === RESUMEN ||
    pestanas.some((libro) => valorDeLibro(libro.id) === activa);

  function abrir(id: number) {
    setAbiertos((actuales) =>
      actuales.includes(id) ? actuales : [...actuales, id],
    );
    setActiva(valorDeLibro(id));
  }

  // Pedido nuevo de ubicar una fila: se abre el libro (se ajusta durante el render, sin efecto extra).
  if (foco && foco.clave !== claveAtendida) {
    setClaveAtendida(foco.clave);
    if (libros.some((libro) => libro.id === foco.libroId)) {
      setFilaVigente(foco);
      abrir(foco.libroId);
    }
  }

  function cerrar(id: number) {
    if (filaVigente?.libroId === id) setFilaVigente(null);
    setAbiertos((actuales) => actuales.filter((abierto) => abierto !== id));
    setActiva(RESUMEN);
  }

  if (libros.length === 0) return null;

  return (
    <Tabs
      value={pestanaVigente ? activa : RESUMEN}
      onValueChange={setActiva}
      className="space-y-3"
    >
      <TabsList className="h-auto max-w-full flex-wrap justify-start gap-1">
        <TabsTrigger value={RESUMEN}>
          Resumen
          <span className="ml-2 min-w-5 rounded-full bg-muted px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-muted-foreground">
            {libros.length}
          </span>
        </TabsTrigger>
        {pestanas.map((libro) => (
          <TabsTrigger key={libro.id} value={valorDeLibro(libro.id)}>
            {nombreDeLibro(libro)}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value={RESUMEN} className="mt-0">
        <ul
          aria-label={etiqueta}
          className="divide-y rounded-lg border bg-muted/40"
        >
          {libros.map((libro) => (
            <ResumenLibroFila
              key={libro.id}
              libro={libro}
              onAbrir={() => abrir(libro.id)}
            />
          ))}
        </ul>
      </TabsContent>

      {pestanas.map((libro) => (
        <TabsContent
          key={libro.id}
          value={valorDeLibro(libro.id)}
          className="mt-0"
        >
          <DetalleLibro
            cuentaMensualId={cuentaMensualId}
            libroId={libro.id}
            nombre={nombreDeLibro(libro)}
            onCerrar={() => cerrar(libro.id)}
            resaltar={
              filaVigente?.libroId === libro.id
                ? {
                    transaccionId: filaVigente.transaccionId,
                    clave: filaVigente.clave,
                  }
                : undefined
            }
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
