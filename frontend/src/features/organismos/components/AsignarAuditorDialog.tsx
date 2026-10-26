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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAsignarAuditor } from '../hooks/useAsignarAuditor';
import { useAuditores } from '../hooks/useAuditores';
import type { Organismo } from '../types';

interface AsignarAuditorDialogProps {
  /** El organismo al que se le asigna; null mantiene el diálogo cerrado. */
  organismo: Organismo | null;
  onCerrar: () => void;
}

/** Elige, entre los auditores activos, quién audita el organismo. Reemplaza al auditor anterior. */
export function AsignarAuditorDialog({
  organismo,
  onCerrar,
}: AsignarAuditorDialogProps) {
  const abierto = organismo !== null;
  const [auditorId, setAuditorId] = useState('');
  const auditores = useAuditores({ enabled: abierto });
  const asignar = useAsignarAuditor();

  const candidatos = auditores.data ?? [];
  const elegido = candidatos.find((a) => String(a.id) === auditorId);
  const esElActual = organismo?.auditorId === elegido?.id;
  const cambia = Boolean(organismo?.auditor);

  function cerrar() {
    setAuditorId('');
    asignar.reset();
    onCerrar();
  }

  function cambiarApertura(siguiente: boolean) {
    // Mientras se guarda no se cierra: evita perder el resultado de la operación.
    if (asignar.isPending || siguiente) return;
    cerrar();
  }

  function confirmar() {
    if (!organismo || !elegido || esElActual) return;
    asignar.mutate(
      {
        organismoId: organismo.id,
        auditorId: elegido.id,
        nombreAuditor: `${elegido.nombre} ${elegido.apellido}`,
      },
      { onSuccess: cerrar },
    );
  }

  return (
    <Dialog open={abierto} onOpenChange={cambiarApertura}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cambia ? 'Cambiar el auditor' : 'Asignar un auditor'}
          </DialogTitle>
          <DialogDescription>
            {organismo && (
              <>
                «{organismo.nombre}» tiene un solo auditor a la vez
                {cambia &&
                  ` (hoy ${organismo.auditor?.nombre} ${organismo.auditor?.apellido})`}
                . Quien se asigne verá solo las rendiciones de sus organismos.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="auditor-elegido">Auditor</Label>
          <Select
            value={auditorId}
            onValueChange={setAuditorId}
            disabled={auditores.isPending || candidatos.length === 0}
          >
            <SelectTrigger id="auditor-elegido">
              <SelectValue
                placeholder={
                  auditores.isPending
                    ? 'Cargando auditores…'
                    : candidatos.length === 0
                      ? 'No hay auditores activos'
                      : 'Seleccione un auditor'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {candidatos.map((auditor) => (
                <SelectItem key={auditor.id} value={String(auditor.id)}>
                  {auditor.apellido}, {auditor.nombre} · {auditor.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {auditores.isError && (
            <p role="alert" className="text-sm text-danger">
              No se pudo cargar la lista de auditores.
            </p>
          )}
          {esElActual && elegido && (
            <p className="text-sm text-muted-foreground">
              Ya es el auditor de este organismo.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => cambiarApertura(false)}
            disabled={asignar.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={!elegido || esElActual || asignar.isPending}
          >
            {asignar.isPending && <Loader2 className="animate-spin" />}
            {cambia ? 'Cambiar auditor' : 'Asignar auditor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
