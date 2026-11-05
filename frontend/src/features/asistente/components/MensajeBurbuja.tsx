import { AlertCircle, Bot, Database, RotateCcw, User } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MensajeChat } from '../types';
import { plural } from '../lib/texto';
import { urlSegura } from '../lib/urls';

const componentesMarkdown: Components = {
  p: ({ children }) => <p className="leading-relaxed">{children}</p>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2 hover:text-foreground"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-1 pl-5">{children}</ol>
  ),
  h1: ({ children }) => <p className="font-semibold">{children}</p>,
  h2: ({ children }) => <p className="font-semibold">{children}</p>,
  h3: ({ children }) => <p className="font-semibold">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-maquina text-[0.85em]">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/50 p-3 font-maquina text-[13px]">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-auto rounded-md border">
      <table className="w-full text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b bg-muted px-2.5 py-1.5 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b px-2.5 py-1.5 tabular-nums">{children}</td>
  ),
};

interface MensajeBurbujaProps {
  mensaje: MensajeChat;
  /** Solo en el mensaje de error de la última pregunta. */
  onReintentar?: () => void;
  reintentando?: boolean;
  /** Muestra en el panel lateral el razonamiento de esta respuesta. */
  onVerRazonamiento?: () => void;
  /** El panel lateral está mostrando justamente el razonamiento de esta respuesta. */
  razonamientoActivo?: boolean;
}

/** Un turno del hilo. La etiqueta («Usted» / «Copiloto») identifica a quien habla sin depender del color. */
export function MensajeBurbuja({
  mensaje,
  onReintentar,
  reintentando,
  onVerRazonamiento,
  razonamientoActivo,
}: MensajeBurbujaProps) {
  const esUsuario = mensaje.rol === 'user';
  const Icono = esUsuario ? User : mensaje.esError ? AlertCircle : Bot;

  return (
    <article
      aria-label={esUsuario ? 'Su pregunta' : 'Respuesta del copiloto'}
      className={cn('flex flex-col gap-1.5', esUsuario && 'items-end')}
    >
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icono className="size-3.5" aria-hidden />
        {esUsuario ? 'Usted' : 'Copiloto'}
      </p>

      {esUsuario ? (
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-lg bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
          {mensaje.contenido}
        </p>
      ) : mensaje.esError ? (
        <div
          role="alert"
          className="max-w-[85%] space-y-3 rounded-lg border border-danger-border bg-danger-subtle px-3.5 py-2.5 text-sm text-danger"
        >
          <p>{mensaje.contenido}</p>
          {onReintentar && (
            <Button
              size="sm"
              variant="outline"
              onClick={onReintentar}
              disabled={reintentando}
              className="min-h-9 bg-background text-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Reintentar
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-full space-y-3">
          <div className="max-w-[92%] space-y-2 rounded-lg border bg-card px-3.5 py-2.5 text-sm text-card-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              skipHtml
              urlTransform={urlSegura}
              components={componentesMarkdown}
            >
              {mensaje.contenido}
            </ReactMarkdown>
          </div>
          {mensaje.pasos && mensaje.pasos.length > 0 && onVerRazonamiento && (
            <button
              type="button"
              onClick={onVerRazonamiento}
              aria-pressed={razonamientoActivo}
              aria-controls="panel-razonamiento"
              className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                razonamientoActivo
                  ? 'border-foreground/40 bg-accent'
                  : 'bg-card',
              )}
            >
              <Database className="size-4 text-muted-foreground" aria-hidden />
              Ver razonamiento · {plural(mensaje.pasos.length, 'paso', 'pasos')}
            </button>
          )}
        </div>
      )}
    </article>
  );
}
