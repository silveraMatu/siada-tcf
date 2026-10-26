import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const MAX_MOTIVO = 2000;

interface DescartarObservacionDialogProps {
  open: boolean;
  /** Se invoca con el motivo ya recortado; nunca vacío. */
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
  enviando: boolean;
}

/** Descartar un hallazgo exige decir por qué: queda guardado junto a la revisión. */
export function DescartarObservacionDialog({
  open,
  onConfirmar,
  onCancelar,
  enviando,
}: DescartarObservacionDialogProps) {
  const [motivo, setMotivo] = useState('');
  const limpio = motivo.trim();

  function cambiarApertura(abierto: boolean) {
    // Mientras se guarda no se cierra: evita perder el resultado de la operación.
    if (abierto || enviando) return;
    setMotivo('');
    onCancelar();
  }

  return (
    <Dialog open={open} onOpenChange={cambiarApertura}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descartar la observación</DialogTitle>
          <DialogDescription>
            Indique por qué el hallazgo no corresponde. El motivo queda
            registrado y se puede reabrir mientras la auditoría esté en curso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="motivo-descarte">Motivo</Label>
          <Textarea
            id="motivo-descarte"
            value={motivo}
            maxLength={MAX_MOTIVO}
            required
            aria-describedby="motivo-descarte-ayuda"
            onChange={(e) => setMotivo(e.target.value)}
          />
          <p
            id="motivo-descarte-ayuda"
            className="text-xs tabular-nums text-muted-foreground"
          >
            {limpio === ''
              ? 'El motivo es obligatorio para descartar.'
              : `${motivo.length} de ${MAX_MOTIVO} caracteres`}
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => cambiarApertura(false)}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirmar(limpio)}
            disabled={limpio === '' || enviando}
          >
            {enviando && <Loader2 className="animate-spin" />}
            Descartar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
