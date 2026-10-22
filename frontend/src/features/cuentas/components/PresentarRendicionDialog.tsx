import { isAxiosError } from 'axios';
import { Loader2, Send } from 'lucide-react';
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
import { usePresentarCuentaMensual } from '../hooks/usePresentarCuentaMensual';
import type { CuentaMensual } from '../types';

interface PresentarRendicionDialogProps {
  cuentaId: number;
  /** Se invoca con la cuenta ya presentada, para que la vista actualice su copia. */
  onPresentada: (cuenta: CuentaMensual) => void;
  /** La cuenta ya no estaba en borrador (409): la vista debe traer el estado vigente. */
  onDesactualizada: () => void;
  /** Lo que se presentará, para que el responsable lo vea antes del paso irreversible. */
  resumen?: { libros: number; transacciones: number };
  /** Sin ningún libro cargado no hay nada que presentar. */
  deshabilitado?: boolean;
}

export function PresentarRendicionDialog({
  cuentaId,
  onPresentada,
  onDesactualizada,
  resumen,
  deshabilitado = false,
}: PresentarRendicionDialogProps) {
  const [abierto, setAbierto] = useState(false);
  const presentar = usePresentarCuentaMensual();

  function confirmar(evento: MouseEvent) {
    // Radix cerraría el diálogo al instante: se cierra recién cuando el servidor responde.
    evento.preventDefault();
    presentar.mutate(cuentaId, {
      onSuccess: (cuenta) => {
        setAbierto(false);
        onPresentada(cuenta);
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 409) {
          setAbierto(false);
          onDesactualizada();
        }
      },
    });
  }

  return (
    <AlertDialog
      open={abierto}
      // Mientras se envía no se puede cerrar: evita perder el resultado de la operación.
      onOpenChange={(valor) => !presentar.isPending && setAbierto(valor)}
    >
      <AlertDialogTrigger asChild>
        <Button disabled={deshabilitado}>
          <Send />
          Presentar Rendición Definitiva
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Presentar la rendición definitiva?
          </AlertDialogTitle>
          <AlertDialogDescription>
            No podrá modificar ni subir más archivos a esta rendición una vez
            presentada. Quedará lista para que el auditor la revise.
            {resumen && (
              <>
                {' '}
                Se presentará{resumen.libros === 1 ? '' : 'n'}{' '}
                <strong>
                  {resumen.libros} {resumen.libros === 1 ? 'libro' : 'libros'}
                </strong>{' '}
                con{' '}
                <strong>
                  {resumen.transacciones}{' '}
                  {resumen.transacciones === 1
                    ? 'transacción'
                    : 'transacciones'}
                </strong>
                .
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={presentar.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction onClick={confirmar} disabled={presentar.isPending}>
            {presentar.isPending && <Loader2 className="animate-spin" />}
            Presentar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
