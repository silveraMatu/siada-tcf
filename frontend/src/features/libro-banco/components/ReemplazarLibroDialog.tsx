import { Loader2 } from 'lucide-react';
import type { MouseEvent } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { LibroExistente } from '../types';

const formatoFecha = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

interface ReemplazarLibroDialogProps {
  /** Libro ya cargado con el mismo N° de cuenta; el aviso se muestra mientras haya uno. */
  libro: LibroExistente | null;
  enviando: boolean;
  onReemplazar: () => void;
  /** Rechaza la operación: no se guarda nada y se conserva el libro actual. */
  onCancelar: () => void;
}

/** Ofrece reemplazar el libro cargado o rechazar la operación cuando el N° de cuenta ya existe. */
export function ReemplazarLibroDialog({
  libro,
  enviando,
  onReemplazar,
  onCancelar,
}: ReemplazarLibroDialogProps) {
  function confirmar(evento: MouseEvent) {
    // Radix cerraría el aviso al instante: se cierra recién cuando el servidor responde.
    evento.preventDefault();
    onReemplazar();
  }

  return (
    <AlertDialog
      open={libro !== null}
      // Mientras se envía no se puede cerrar: evita perder el resultado de la operación.
      onOpenChange={(abierto) => !abierto && !enviando && onCancelar()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Ya hay un libro para esta cuenta corriente
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cada rendición admite un solo libro por N° de cuenta corriente. Si
            lo reemplaza, el libro cargado se elimina y se guarda el del archivo
            nuevo. Si cancela, no se guarda nada y se conserva el actual.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {libro && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-lg border bg-muted/50 p-4 text-sm">
            <dt className="text-muted-foreground">N° de Cta. Cte.</dt>
            <dd className="font-medium">{libro.numeroCuentaCte}</dd>
            <dt className="text-muted-foreground">Transacciones</dt>
            <dd className="font-medium">{libro.cantidadTransacciones}</dd>
            {libro.fechaCreacion && (
              <>
                <dt className="text-muted-foreground">Cargado el</dt>
                <dd className="font-medium">
                  {formatoFecha.format(new Date(libro.fechaCreacion))}
                </dd>
              </>
            )}
          </dl>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={enviando}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={enviando}>
            {enviando && <Loader2 className="animate-spin" />}
            Reemplazar libro
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
