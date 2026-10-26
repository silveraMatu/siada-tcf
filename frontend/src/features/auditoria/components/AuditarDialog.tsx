import { Loader2, Play } from 'lucide-react';
import { useState, type MouseEvent } from 'react';

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
import { useAuditar } from '../hooks/useAuditar';

interface AuditarDialogProps {
  cuentaMensualId: number;
  /** Se invoca cuando la ejecución quedó guardada, con un resumen para anunciarlo. */
  onAuditada?: () => void;
}

/**
 * «Auditar rendición»: pide confirmación porque el auditor toma la rendición (pasa a «En auditoría»)
 * y el motor deja guardada su ejecución.
 */
export function AuditarDialog({
  cuentaMensualId,
  onAuditada,
}: AuditarDialogProps) {
  const [abierto, setAbierto] = useState(false);
  const auditar = useAuditar(cuentaMensualId);

  function confirmar(evento: MouseEvent) {
    // Radix cerraría el aviso al instante: se cierra recién cuando el servidor responde.
    evento.preventDefault();
    auditar.mutate(undefined, {
      onSuccess: () => {
        setAbierto(false);
        onAuditada?.();
      },
      // el aviso del error ya lo muestra el hook; se cierra para volver a ver la pantalla
      onError: () => setAbierto(false),
    });
  }

  return (
    <AlertDialog
      open={abierto}
      // Mientras se audita no se puede cerrar: evita perder el resultado de la operación.
      onOpenChange={(valor) => !auditar.isPending && setAbierto(valor)}
    >
      <AlertDialogTrigger asChild>
        <Button>
          <Play />
          Auditar rendición
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Auditar esta rendición?</AlertDialogTitle>
          <AlertDialogDescription>
            La rendición queda a su cargo y pasa a «En auditoría». El motor
            corre sobre sus libros y deja guardado el resultado, que después va
            a poder revisar hallazgo por hallazgo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={auditar.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={auditar.isPending}>
            {auditar.isPending && <Loader2 className="animate-spin" />}
            Auditar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
