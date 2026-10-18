import { Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { IngestaDialog } from '@/features/libro-banco/components/IngestaDialog';
import { MESES } from '../constants';
import { useResolverCuentaMensual } from '../hooks/useResolverCuentaMensual';
import type { ContextoCuenta, CuentaMensual } from '../types';
import { EstadoBadge } from './EstadoBadge';

interface CuentaMensualDetalleProps {
  cuenta: CuentaMensual;
  contexto: ContextoCuenta;
  onActualizada: (cuenta: CuentaMensual) => void;
}

export function CuentaMensualDetalle({
  cuenta,
  contexto,
  onActualizada,
}: CuentaMensualDetalleProps) {
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const resolver = useResolverCuentaMensual();

  // Tras cargar documentos se vuelve a resolver (es idempotente) para traer el estado vigente.
  function refrescar() {
    resolver.mutate(
      {
        organismoId: contexto.organismoId,
        ejercicioFiscal: contexto.ejercicioFiscal,
        mes: contexto.mes,
      },
      { onSuccess: onActualizada },
    );
  }

  return (
    <section className="rounded-xl border bg-card p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Cuenta mensual
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {MESES[contexto.mes - 1]} {contexto.ejercicioFiscal}
          </h2>
          <p className="text-sm text-muted-foreground">
            {contexto.organismoNombre}
          </p>
        </div>

        <div className="flex flex-col items-start gap-4 sm:items-end">
          <EstadoBadge estado={cuenta.estado} />
          <Button onClick={() => setDialogAbierto(true)}>
            <Upload />
            Cargar Documentos
          </Button>
        </div>
      </div>

      <IngestaDialog
        open={dialogAbierto}
        onOpenChange={setDialogAbierto}
        cuentaMensualId={cuenta.id}
        onIngestada={refrescar}
      />
    </section>
  );
}
