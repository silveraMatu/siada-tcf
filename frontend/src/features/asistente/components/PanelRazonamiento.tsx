import { Database, Loader2 } from 'lucide-react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';
import { plural } from '../lib/texto';
import type { MensajeChat, PasoRazonamiento } from '../types';
import { TrazaExplicable } from './TrazaExplicable';

interface PanelRazonamientoProps {
  /** Respuesta del copiloto cuyo razonamiento se muestra; sin ella, el panel explica para qué sirve. */
  mensaje?: MensajeChat;
  /** La pregunta que originó esa respuesta, para saber a qué corresponde lo que se ve. */
  pregunta?: string;
  /** Hay una consulta en curso y todavía no se eligió otra respuesta para mirar: se ven los pasos en vivo. */
  enCurso: boolean;
  pasosEnVivo?: PasoRazonamiento[];
  className?: string;
}

/**
 * Tarjeta lateral con el razonamiento explicable de la IA. Vive fuera del hilo para que la
 * conversación quede limpia y el auditor pueda ver qué hizo el copiloto para llegar a cada cifra.
 */
export const PanelRazonamiento = forwardRef<
  HTMLElement,
  PanelRazonamientoProps
>(function PanelRazonamiento(
  { mensaje, pregunta, enCurso, pasosEnVivo = [], className },
  ref,
) {
  const pasos = enCurso ? pasosEnVivo : (mensaje?.pasos ?? []);
  // en curso: cuando ningún paso espera su resultado, la IA está redactando o por empezar
  const analizando = enCurso && !pasos.some((p) => p.estado === 'en_curso');

  return (
    <aside
      ref={ref}
      id="panel-razonamiento"
      tabIndex={-1}
      aria-label="Razonamiento de la IA"
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <header className="space-y-1 border-b bg-muted/40 px-4 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Database className="size-4 text-muted-foreground" aria-hidden />
          Razonamiento de la IA
          {pasos.length > 0 && (
            <span className="font-normal text-muted-foreground">
              · {plural(pasos.length, 'paso', 'pasos')}
            </span>
          )}
        </h3>
        {pregunta && !enCurso && (
          <p
            title={pregunta}
            className="truncate text-xs text-muted-foreground"
          >
            Para: {pregunta}
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {enCurso ? (
          <div className="space-y-4">
            <TrazaExplicable pasos={pasos} />
            {analizando && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2
                  className="size-4 motion-safe:animate-spin"
                  aria-hidden
                />
                {pasos.length === 0
                  ? 'Analizando su pregunta…'
                  : 'Analizando los resultados…'}
              </p>
            )}
          </div>
        ) : mensaje && pasos.length > 0 ? (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Estos son los pasos que siguió la IA sobre los datos del
              organismo. Verifique las cifras en los libros antes de dictaminar:
              la decisión es suya.
            </p>
            <TrazaExplicable pasos={pasos} />
          </div>
        ) : mensaje ? (
          <p className="text-sm text-muted-foreground">
            Esta respuesta no necesitó consultar los datos del organismo.
          </p>
        ) : (
          <div className="space-y-1 py-6 text-center">
            <p className="text-sm font-medium">Todavía no hay pasos</p>
            <p className="text-sm text-muted-foreground">
              Cuando el copiloto responda, verá acá, paso a paso, qué buscó en
              los datos del organismo para llegar a su respuesta.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
});
