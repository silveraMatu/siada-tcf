import { AlertCircle, CheckCircle2, Loader2, MinusCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { plural } from '../lib/texto';
import type { PasoRazonamiento } from '../types';

interface Presentacion {
  icono: ReactNode;
  /** Lo que lee un lector de pantalla: el estado no puede depender solo del ícono ni del color. */
  texto: string;
  /** Color del ícono y del resultado. */
  tono: string;
}

function presentacion(estado: PasoRazonamiento['estado']): Presentacion {
  switch (estado) {
    case 'en_curso':
      return {
        icono: (
          <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden />
        ),
        texto: 'En curso',
        tono: 'text-muted-foreground',
      };
    case 'completado':
      return {
        icono: <CheckCircle2 className="size-3.5" aria-hidden />,
        texto: 'Completado',
        tono: 'text-success',
      };
    case 'sin_resultados':
      return {
        icono: <MinusCircle className="size-3.5" aria-hidden />,
        texto: 'Sin resultados',
        tono: 'text-muted-foreground',
      };
    case 'error':
      return {
        icono: <AlertCircle className="size-3.5" aria-hidden />,
        texto: 'No se pudo completar',
        tono: 'text-danger',
      };
    default:
      // un estado nuevo que todavía no sabemos dibujar
      return {
        icono: <MinusCircle className="size-3.5" aria-hidden />,
        texto: estado,
        tono: 'text-muted-foreground',
      };
  }
}

function Paso({ paso }: { paso: PasoRazonamiento }) {
  const { icono, texto, tono } = presentacion(paso.estado);
  const terminado = paso.estado !== 'en_curso';

  return (
    <li
      aria-busy={!terminado}
      className="relative space-y-1.5 pb-6 pl-9 last:pb-0 before:absolute before:bottom-0 before:left-3 before:top-7 before:w-px before:bg-border last:before:hidden"
    >
      <span
        className={cn(
          'absolute left-0 top-0 flex size-6 items-center justify-center rounded-full border bg-background',
          tono,
        )}
      >
        {icono}
        <span className="sr-only">{texto}</span>
      </span>

      <h4 className="min-h-6 text-sm font-medium leading-snug">
        {paso.descripcion}
      </h4>

      {paso.fuentes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Fuentes: {paso.fuentes.join(' · ')}
        </p>
      )}

      {paso.resultado && (
        <p className={cn('text-sm', paso.estado === 'error' ? tono : '')}>
          {paso.resultado}
        </p>
      )}

      {(paso.cantidadRegistros !== null ||
        paso.duracionMs !== null ||
        paso.parcial) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {paso.cantidadRegistros !== null && (
            <Badge variant="outline" className="font-normal tabular-nums">
              {plural(paso.cantidadRegistros, 'registro', 'registros')}
            </Badge>
          )}
          {paso.duracionMs !== null && (
            <Badge variant="outline" className="font-normal tabular-nums">
              {paso.duracionMs} ms
            </Badge>
          )}
          {paso.parcial && (
            <Badge variant="outline" className="font-normal">
              Resultado parcial
            </Badge>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Cómo llegó la IA a su respuesta, paso por paso y en lenguaje de negocio: qué buscó, en qué áreas y
 * qué encontró. No muestra consultas técnicas: el auditor coteja las cifras en los libros.
 */
export function TrazaExplicable({ pasos }: { pasos: PasoRazonamiento[] }) {
  if (pasos.length === 0) return null;

  return (
    <ol aria-label="Pasos de la IA">
      {pasos.map((paso) => (
        <Paso key={paso.id} paso={paso} />
      ))}
    </ol>
  );
}
