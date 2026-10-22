import { Lock, Upload } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { IngestaDialog } from '@/features/libro-banco/components/IngestaDialog';
import { LibroGuardado } from '@/features/libro-banco/components/LibroGuardado';
import { useLibrosBanco } from '@/features/libro-banco/hooks/useLibrosBanco';
import { ESTADOS, MESES } from '../constants';
import { useResolverCuentaMensual } from '../hooks/useResolverCuentaMensual';
import type { ContextoCuenta, CuentaMensual } from '../types';
import { EstadoBadge } from './EstadoBadge';
import { PresentarRendicionDialog } from './PresentarRendicionDialog';

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

  // Solo en borrador se pueden cargar documentos: después la evidencia es inmutable.
  const enBorrador = cuenta.estado === 'EN_BORRADOR';

  // Lo ya cargado: se ve en borrador (antes del paso irreversible de presentar) y habilita presentar.
  const libros = useLibrosBanco(cuenta.id);
  const sinLibros = !libros.data || libros.data.length === 0;
  const resumen = libros.data && {
    libros: libros.data.length,
    transacciones: libros.data.reduce(
      (total, libro) => total + libro.transacciones.length,
      0,
    ),
  };
  const etiquetaEstado =
    ESTADOS[cuenta.estado as keyof typeof ESTADOS]?.label ?? cuenta.estado;

  // Se vuelve a resolver (es idempotente) para traer el estado vigente de la cuenta.
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
          {enBorrador && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <PresentarRendicionDialog
                  cuentaId={cuenta.id}
                  onPresentada={onActualizada}
                  onDesactualizada={refrescar}
                  resumen={resumen}
                  deshabilitado={sinLibros}
                />
                <Button
                  variant="outline"
                  onClick={() => setDialogAbierto(true)}
                >
                  <Upload />
                  Cargar Documentos
                </Button>
              </div>
              {sinLibros && !libros.isPending && (
                <p className="text-xs text-muted-foreground">
                  Cargue al menos un libro para poder presentar la rendición.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {enBorrador ? (
        <>
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-medium">Libros cargados</h3>
            <LibroGuardado cuentaMensualId={cuenta.id} enBorrador />
          </div>
          <IngestaDialog
            open={dialogAbierto}
            onOpenChange={setDialogAbierto}
            cuentaMensualId={cuenta.id}
            onIngestada={refrescar}
          />
        </>
      ) : (
        <div className="mt-6 space-y-6">
          <Alert variant="info">
            <Lock aria-hidden />
            <AlertDescription>
              Esta rendición ya ha sido presentada y se encuentra bloqueada para
              modificaciones. Estado actual: <strong>{etiquetaEstado}</strong>
            </AlertDescription>
          </Alert>
          <LibroGuardado cuentaMensualId={cuenta.id} />
        </div>
      )}
    </section>
  );
}
