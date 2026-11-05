import { Loader2, Send, Sparkles, Square, Trash2 } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useConsultarAsistente } from '../hooks/useConsultarAsistente';
import {
  MENSAJE_CANCELADO,
  esCancelacion,
  mensajeDeError,
} from '../lib/errores';
import type { MensajeChat } from '../types';
import { MensajeBurbuja } from './MensajeBurbuja';
import { PanelRazonamiento } from './PanelRazonamiento';

export const MAX_PREGUNTA = 4000;
/** Desde cuántos caracteres se muestra el contador, para no sumar ruido a una pregunta corta. */
const AVISO_LONGITUD = 3500;
/** Pasado este tiempo se avisa que la consulta puede demorar. */
const ESPERA_LARGA_MS = 15_000;

const SUGERENCIAS_RENDICION = [
  '¿Cuánto se depositó y cuánto se retiró en el libro banco de esta rendición?',
  '¿Qué observaciones abiertas tiene esta rendición?',
  '¿Cuál es la diferencia entre el saldo final del libro banco y el de Ingresos y Egresos?',
  '¿Cuáles son los 10 retiros más altos del libro banco?',
];

const SUGERENCIAS_ORGANISMO = [
  '¿En qué estado está cada rendición de este organismo?',
  'Resumen de las observaciones por regla (V1, V2, V3, C4, C5, C6).',
  '¿Qué rendiciones tienen observaciones abiertas?',
  '¿Cuál fue la conclusión de la última auditoría de cada mes?',
];

let contador = 0;
const nuevoId = () => `m-${Date.now()}-${++contador}`;

interface ChatCopilotoProps {
  organismoId?: number;
  cuentaMensualId?: number;
}

/**
 * Chat con el copiloto de IA. El historial vive solo en esta pantalla: el servidor responde cada
 * pregunta por separado, sin recordar las anteriores. Para no mezclar contextos, quien lo monte debe
 * darle una `key` que cambie con el organismo y la rendición.
 */
export function ChatCopiloto({
  organismoId,
  cuentaMensualId,
}: ChatCopilotoProps) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [borrador, setBorrador] = useState('');
  const [esperaLarga, setEsperaLarga] = useState(false);
  const [confirmandoLimpiar, setConfirmandoLimpiar] = useState(false);
  /** Respuesta cuyo razonamiento muestra el panel lateral; null = la que esté por llegar. */
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const ultimaPregunta = useRef('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hiloRef = useRef<HTMLDivElement>(null);
  const ultimoRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const ayudaId = useId();
  const etiquetaId = useId();

  const consulta = useConsultarAsistente();
  const isLoading = consulta.isPending;

  // El aviso de espera larga solo se muestra con una consulta en curso; `consultar` lo reinicia.
  useEffect(() => {
    if (!isLoading) return;
    const temporizador = setTimeout(
      () => setEsperaLarga(true),
      ESPERA_LARGA_MS,
    );
    return () => clearTimeout(temporizador);
  }, [isLoading]);

  // Mueve solo el hilo (no la página): una respuesta nueva se lee desde su primera línea; la pregunta
  // propia y el aviso de espera llevan al final. Sin animación si la persona pidió menos movimiento.
  useEffect(() => {
    const hilo = hiloRef.current;
    if (!hilo) return;
    const reducido = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const alInicioDeLaRespuesta =
      !isLoading && ultimoRef.current?.dataset.rol === 'assistant';
    hilo.scrollTo?.({
      top: alInicioDeLaRespuesta
        ? Math.max(0, (ultimoRef.current?.offsetTop ?? 0) - 12)
        : hilo.scrollHeight,
      behavior: reducido ? 'auto' : 'smooth',
    });
  }, [mensajes.length, isLoading]);

  function consultar(pregunta: string) {
    ultimaPregunta.current = pregunta;
    setEsperaLarga(false);
    consulta.mutate(
      { pregunta, organismoId, cuentaMensualId },
      {
        onSuccess: (respuesta) => {
          const id = nuevoId();
          setMensajes((previos) => [
            ...previos,
            {
              id,
              rol: 'assistant',
              contenido: respuesta.respuesta,
              pasos: respuesta.pasos,
            },
          ]);
          // el panel pasa a la respuesta nueva, salvo que la persona ya haya elegido mirar otra
          setSeleccionId((actual) => actual ?? id);
        },
        onError: (error) =>
          setMensajes((previos) => [
            ...previos,
            {
              id: nuevoId(),
              rol: 'assistant',
              contenido: esCancelacion(error)
                ? MENSAJE_CANCELADO
                : mensajeDeError(error),
              esError: true,
            },
          ]),
      },
    );
  }

  function enviar(texto: string) {
    const pregunta = texto.trim();
    if (pregunta === '' || isLoading) return;
    setMensajes((previos) => [
      ...previos,
      { id: nuevoId(), rol: 'user', contenido: pregunta },
    ]);
    setBorrador('');
    setSeleccionId(null);
    consultar(pregunta);
    textareaRef.current?.focus();
  }

  function reintentar() {
    if (isLoading || ultimaPregunta.current === '') return;
    // el aviso de error se reemplaza por el nuevo intento; la pregunta ya está en el hilo
    setMensajes((previos) => previos.filter((m) => !m.esError));
    setSeleccionId(null);
    consultar(ultimaPregunta.current);
    textareaRef.current?.focus();
  }

  function alEnviarFormulario(evento: FormEvent) {
    evento.preventDefault();
    enviar(borrador);
  }

  function alPresionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      evento.key === 'Enter' &&
      !evento.shiftKey &&
      !evento.nativeEvent.isComposing
    ) {
      evento.preventDefault();
      enviar(borrador);
    }
  }

  function limpiar() {
    setMensajes([]);
    setSeleccionId(null);
    setConfirmandoLimpiar(false);
    ultimaPregunta.current = '';
    consulta.reset();
    textareaRef.current?.focus();
  }

  function verRazonamiento(id: string) {
    setSeleccionId(id);
    // en pantallas angostas el panel queda debajo del chat: se lo trae a la vista y se le da el foco
    const enColumnas = window.matchMedia?.('(min-width: 1024px)').matches;
    if (!enColumnas) {
      panelRef.current?.scrollIntoView?.({ block: 'nearest' });
    }
    panelRef.current?.focus({ preventScroll: true });
  }

  const seleccionado = mensajes.find((m) => m.id === seleccionId);
  const indiceSeleccion = seleccionado ? mensajes.indexOf(seleccionado) : -1;
  const preguntaDeLaSeleccion = mensajes
    .slice(0, Math.max(indiceSeleccion, 0))
    .reverse()
    .find((m) => m.rol === 'user')?.contenido;

  // lo que el copiloto está haciendo ahora, para quien sigue el hilo con un lector de pantalla
  const pasoEnCurso = consulta.pasosEnVivo.find((p) => p.estado === 'en_curso');
  const textoDeEspera = pasoEnCurso
    ? `Consultando: ${pasoEnCurso.descripcion}`
    : consulta.pasosEnVivo.length > 0
      ? 'Analizando los resultados…'
      : 'Analizando su pregunta…';

  const sugerencias =
    cuentaMensualId !== undefined
      ? SUGERENCIAS_RENDICION
      : SUGERENCIAS_ORGANISMO;
  const ultimo = mensajes[mensajes.length - 1];
  const vacio = borrador.trim() === '';

  return (
    <div className="grid gap-4 lg:h-[max(32rem,calc(100dvh-16rem))] lg:grid-cols-[minmax(0,1fr)_25rem]">
      <section
        aria-label="Chat con el copiloto de IA"
        className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm"
      >
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            Orienta, no dictamina. Cada pregunta es independiente: no recuerda
            las anteriores.
          </p>
          {mensajes.length > 0 && (
            <AlertDialog
              open={confirmandoLimpiar}
              onOpenChange={setConfirmandoLimpiar}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  className="shrink-0 text-muted-foreground"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Limpiar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Limpiar la conversación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borran las preguntas, las respuestas y el razonamiento de
                    la IA que ve en pantalla. No se guardan en otro lado.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={limpiar}>
                    Limpiar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div
          ref={hiloRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Conversación con el copiloto"
          aria-busy={isLoading}
          tabIndex={0}
          className="relative max-h-[max(18rem,calc(100dvh-28rem))] min-h-72 flex-1 space-y-5 overflow-y-auto lg:max-h-none px-4 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          {mensajes.length === 0 && !isLoading && (
            <div className="mx-auto max-w-xl space-y-4 py-4">
              <div className="space-y-1 text-center">
                <Sparkles
                  className="mx-auto size-5 text-muted-foreground"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <p className="font-medium">¿Qué quiere consultar?</p>
                <p className="text-sm text-muted-foreground">
                  Pregunte por los libros y las observaciones
                  {cuentaMensualId !== undefined
                    ? ' de esta rendición'
                    : ' del organismo'}
                  . Podrá ver los pasos que siguió la IA para responder.
                </p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {sugerencias.map((sugerencia) => (
                  <li key={sugerencia} className="flex">
                    <button
                      type="button"
                      onClick={() => enviar(sugerencia)}
                      className="min-h-11 w-full rounded-lg border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {sugerencia}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mensajes.map((mensaje) => (
            <div
              key={mensaje.id}
              ref={mensaje === ultimo ? ultimoRef : undefined}
              data-rol={mensaje.rol}
            >
              <MensajeBurbuja
                mensaje={mensaje}
                onReintentar={
                  mensaje.esError && mensaje === ultimo ? reintentar : undefined
                }
                reintentando={isLoading}
                onVerRazonamiento={() => verRazonamiento(mensaje.id)}
                razonamientoActivo={mensaje.id === seleccionId}
              />
            </div>
          ))}

          {isLoading && (
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2
                className="size-4 motion-safe:animate-spin"
                aria-hidden
              />
              {esperaLarga
                ? 'Sigue trabajando. Esto puede tardar un par de minutos.'
                : textoDeEspera}
            </p>
          )}
        </div>

        <form
          onSubmit={alEnviarFormulario}
          className="space-y-2 border-t bg-card p-3"
        >
          <label
            id={etiquetaId}
            htmlFor={`${etiquetaId}-campo`}
            className="sr-only"
          >
            Pregunta para el copiloto
          </label>
          <div className="flex items-end gap-2">
            <Textarea
              id={`${etiquetaId}-campo`}
              ref={textareaRef}
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              onKeyDown={alPresionarTecla}
              readOnly={isLoading}
              maxLength={MAX_PREGUNTA}
              rows={2}
              placeholder="Escriba su pregunta…"
              aria-describedby={ayudaId}
              className="min-h-11 resize-none read-only:opacity-60"
            />
            {isLoading ? (
              <Button
                type="button"
                variant="outline"
                onClick={consulta.cancelar}
                className="h-11 shrink-0 px-4"
              >
                <Square className="size-3.5 fill-current" aria-hidden />
                Detener
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={vacio}
                className="h-11 shrink-0 px-4"
              >
                <Send className="size-4" aria-hidden />
                Enviar
              </Button>
            )}
          </div>
          <p
            id={ayudaId}
            className="flex justify-between gap-3 text-xs text-muted-foreground"
          >
            <span>Enter envía · Mayús+Enter agrega una línea</span>
            {borrador.length >= AVISO_LONGITUD && (
              <span className="tabular-nums">
                {borrador.length}/{MAX_PREGUNTA}
              </span>
            )}
          </p>
        </form>
      </section>

      <PanelRazonamiento
        ref={panelRef}
        mensaje={seleccionado}
        pregunta={preguntaDeLaSeleccion}
        enCurso={isLoading && seleccionId === null}
        pasosEnVivo={consulta.pasosEnVivo}
        className={
          mensajes.length === 0
            ? 'hidden lg:flex'
            : 'max-h-[70vh] lg:max-h-none'
        }
      />
    </div>
  );
}
