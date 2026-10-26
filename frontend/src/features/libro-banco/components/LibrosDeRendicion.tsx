import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ResumenLibro } from '@/features/cuentas/types';
import { DetalleIngresosEgresos } from '@/features/ingresos-egresos/components/DetalleIngresosEgresos';
import { nombreDeLibro } from '../lib/formato-libro';
import { DetalleLibro } from './DetalleLibro';
import { ResumenLibroFila } from './ResumenLibroFila';

const RESUMEN = 'resumen';
/** El id es único solo dentro de su tipo: un libro banco y el de Ingresos y Egresos pueden compartirlo. */
const claveDeLibro = (libro: Pick<ResumenLibro, 'tipo' | 'id'>) =>
  `${libro.tipo}:${libro.id}`;
const valorDeLibro = (libro: Pick<ResumenLibro, 'tipo' | 'id'>) =>
  `libro-${claveDeLibro(libro)}`;

const claveDelFoco = (foco: FocoLibro) => `${foco.libroTipo}:${foco.libroId}`;

/** Pedido de abrir un libro y marcar una de sus filas; `clave` cambia en cada pedido. */
export interface FocoLibro {
  libroTipo: string;
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
  const [abiertos, setAbiertos] = useState<string[]>([]);
  const [activa, setActiva] = useState(RESUMEN);
  const [claveAtendida, setClaveAtendida] = useState<number | null>(null);
  // La fila a marcar solo vale mientras esa pestaña siga abierta: al reabrirla no se vuelve a ubicar.
  const [filaVigente, setFilaVigente] = useState<FocoLibro | null>(null);

  // Un libro que ya no está (p. ej. se reemplazó y cambió de id) cierra su pestaña.
  const pestanas = abiertos
    .map((clave) => libros.find((libro) => claveDeLibro(libro) === clave))
    .filter((libro): libro is ResumenLibro => libro !== undefined);
  const pestanaVigente =
    activa === RESUMEN ||
    pestanas.some((libro) => valorDeLibro(libro) === activa);

  function abrir(libro: ResumenLibro) {
    const clave = claveDeLibro(libro);
    setAbiertos((actuales) =>
      actuales.includes(clave) ? actuales : [...actuales, clave],
    );
    setActiva(valorDeLibro(libro));
  }

  // Pedido nuevo de ubicar una fila: se abre el libro (se ajusta durante el render, sin efecto extra).
  if (foco && foco.clave !== claveAtendida) {
    setClaveAtendida(foco.clave);
    const libro = libros.find(
      (candidato) => claveDeLibro(candidato) === claveDelFoco(foco),
    );
    if (libro) {
      setFilaVigente(foco);
      abrir(libro);
    }
  }

  function cerrar(libro: ResumenLibro) {
    const clave = claveDeLibro(libro);
    if (filaVigente && claveDelFoco(filaVigente) === clave) {
      setFilaVigente(null);
    }
    setAbiertos((actuales) => actuales.filter((abierto) => abierto !== clave));
    setActiva(RESUMEN);
  }

  if (libros.length === 0) return null;

  return (
    <Tabs
      value={pestanaVigente ? activa : RESUMEN}
      onValueChange={setActiva}
      className="space-y-3"
    >
      {/* Con ningún libro abierto la lista de pestañas sería una sola («Resumen»): no aporta nada. */}
      <TabsList
        className={
          pestanas.length === 0
            ? 'sr-only'
            : 'h-auto max-w-full flex-wrap justify-start gap-1'
        }
      >
        <TabsTrigger value={RESUMEN}>
          Resumen
          <span className="ml-2 min-w-5 rounded-full bg-muted px-1.5 py-0.5 text-center text-xs font-medium tabular-nums text-muted-foreground">
            {libros.length}
          </span>
        </TabsTrigger>
        {pestanas.map((libro) => (
          <TabsTrigger key={claveDeLibro(libro)} value={valorDeLibro(libro)}>
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
              key={claveDeLibro(libro)}
              libro={libro}
              onAbrir={() => abrir(libro)}
            />
          ))}
        </ul>
      </TabsContent>

      {pestanas.map((libro) => {
        const resaltar =
          filaVigente && claveDelFoco(filaVigente) === claveDeLibro(libro)
            ? {
                transaccionId: filaVigente.transaccionId,
                clave: filaVigente.clave,
              }
            : undefined;
        return (
          <TabsContent
            key={claveDeLibro(libro)}
            value={valorDeLibro(libro)}
            className="mt-0"
          >
            {libro.tipo === 'INGRESOS_EGRESOS' ? (
              <DetalleIngresosEgresos
                cuentaMensualId={cuentaMensualId}
                nombre={nombreDeLibro(libro)}
                onCerrar={() => cerrar(libro)}
                resaltar={resaltar}
              />
            ) : (
              <DetalleLibro
                cuentaMensualId={cuentaMensualId}
                libroId={libro.id}
                nombre={nombreDeLibro(libro)}
                onCerrar={() => cerrar(libro)}
                resaltar={resaltar}
              />
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
