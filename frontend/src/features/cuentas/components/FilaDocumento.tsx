import { CheckCircle2, CircleDashed, Minus } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type EstadoDocumento = 'cargado' | 'falta' | 'no-cargado';

const ESTADOS: Record<
  EstadoDocumento,
  { icono: typeof CheckCircle2; color: string }
> = {
  cargado: { icono: CheckCircle2, color: 'text-success' },
  falta: { icono: CircleDashed, color: 'text-warning' },
  'no-cargado': { icono: Minus, color: 'text-muted-foreground' },
};

interface FilaDocumentoProps {
  titulo: string;
  /** Qué documento es o qué trae: una línea. */
  descripcion: string;
  estado: EstadoDocumento;
  /** Texto del estado; se muestra siempre junto al ícono, el color solo refuerza. */
  etiquetaEstado: string;
  /** Botón de la fila (cargar, agregar, reemplazar); ausente cuando la rendición ya está presentada. */
  accion?: ReactNode;
  children?: ReactNode;
}

/** Un documento de la rendición: qué es, si está cargado, su única acción y lo que ya trae. */
export function FilaDocumento({
  titulo,
  descripcion,
  estado,
  etiquetaEstado,
  accion,
  children,
}: FilaDocumentoProps) {
  const { icono: Icono, color } = ESTADOS[estado];

  return (
    <li className="space-y-4 px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h4 className="font-medium">{titulo}</h4>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-xs font-medium',
                color,
              )}
            >
              <Icono className="size-4" aria-hidden />
              {etiquetaEstado}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{descripcion}</p>
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </div>
      {children}
    </li>
  );
}
