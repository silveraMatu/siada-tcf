import { useEffect, useState, type RefObject } from 'react';

/** Cuánto dura marcada la fila a la que se llevó al auditor. */
const DURACION_RESALTADO_MS = 4000;

/** Fila a ubicar: `clave` cambia en cada pedido, así volver a pedir la misma fila la vuelve a marcar. */
export interface FilaResaltada {
  transaccionId: number;
  clave: number;
}

/**
 * Lleva la vista hasta la fila con `data-transaccion-id` pedido, le da el foco y la marca unos
 * segundos. Devuelve el id de la fila marcada (null cuando ya no lo está).
 */
export function useFilaResaltada(
  contenedor: RefObject<HTMLElement | null>,
  resaltar?: FilaResaltada,
): number | null {
  const [marcada, setMarcada] = useState<number | null>(null);

  const transaccionId = resaltar?.transaccionId;
  const clave = resaltar?.clave;

  useEffect(() => {
    if (transaccionId === undefined) return;
    const fila = contenedor.current?.querySelector<HTMLElement>(
      `[data-transaccion-id="${transaccionId}"]`,
    );
    if (!fila) return;

    const sinMovimiento = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    fila.focus({ preventScroll: true });
    fila.scrollIntoView({
      block: 'center',
      behavior: sinMovimiento ? 'auto' : 'smooth',
    });
    setMarcada(transaccionId);
    const temporizador = setTimeout(
      () => setMarcada(null),
      DURACION_RESALTADO_MS,
    );
    return () => clearTimeout(temporizador);
  }, [contenedor, transaccionId, clave]);

  return marcada;
}
