import { CheckCircle2, Lock } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useIngresosEgresos } from '@/features/ingresos-egresos/hooks/useIngresosEgresos';
import { IngestarIngresosEgresosDialog } from '@/features/ingresos-egresos/components/IngestarIngresosEgresosDialog';
import { resumirIngresosEgresos } from '@/features/ingresos-egresos/lib/resumir-ingresos-egresos';
import { IngestarRaciDialog } from '@/features/raci/components/IngestarRaciDialog';
import { useRaci } from '@/features/raci/hooks/useRaci';
import { resumirRaci } from '@/features/raci/lib/resumir-raci';
import { IngestarRaiDialog } from '@/features/rai/components/IngestarRaiDialog';
import { useRai } from '@/features/rai/hooks/useRai';
import { resumirRai } from '@/features/rai/lib/resumir-rai';
import { IngestaDialog } from '@/features/libro-banco/components/IngestaDialog';
import { useLibrosBanco } from '@/features/libro-banco/hooks/useLibrosBanco';
import { formatearMomento } from '@/features/libro-banco/lib/formato-libro';
import { nombreCompleto } from '@/lib/persona';
import { ESTADOS, MESES } from '../constants';
import { useResolverCuentaMensual } from '../hooks/useResolverCuentaMensual';
import { documentosFaltantes } from '../lib/documentos-faltantes';
import type { ContextoCuenta, CuentaMensual } from '../types';
import { DocumentosDeRendicion } from './DocumentosDeRendicion';
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
  const [libroBancoAbierto, setLibroBancoAbierto] = useState(false);
  const [ingresosEgresosAbierto, setIngresosEgresosAbierto] = useState(false);
  const [raciAbierto, setRaciAbierto] = useState(false);
  const [raiAbierto, setRaiAbierto] = useState(false);
  const resolver = useResolverCuentaMensual();

  // Solo en borrador se pueden cargar documentos: después la evidencia es inmutable.
  const enBorrador = cuenta.estado === 'EN_BORRADOR';

  // Lo ya cargado: se ve en borrador (antes del paso irreversible de presentar) y decide si se puede presentar.
  const librosBanco = useLibrosBanco(cuenta.id);
  const ingresosEgresos = useIngresosEgresos(cuenta.id);
  // El RACI y el RAI son opcionales: no condicionan si se puede presentar ni cuentan como documentos faltantes.
  const raci = useRaci(cuenta.id);
  const rai = useRai(cuenta.id);
  const cargando = librosBanco.isPending || ingresosEgresos.isPending;
  const faltantes = documentosFaltantes({
    librosBanco: librosBanco.data?.length ?? 0,
    ingresosEgresos: Boolean(ingresosEgresos.data),
  });
  const resumen = librosBanco.data &&
    ingresosEgresos.data !== undefined && {
      libros: librosBanco.data.length,
      transacciones: librosBanco.data.reduce(
        (total, libro) => total + libro.transacciones.length,
        0,
      ),
      ingresosEgresos: ingresosEgresos.data
        ? resumirIngresosEgresos(ingresosEgresos.data).filas
        : undefined,
      raci: raci.data ? resumirRaci(raci.data).asientos : undefined,
      rai: rai.data ? resumirRai(rai.data).asientos : undefined,
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
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {MESES[contexto.mes - 1]} {contexto.ejercicioFiscal}
          </h2>
          <p className="text-sm text-muted-foreground">
            {contexto.organismoNombre}
          </p>
        </div>

        <div className="flex flex-col items-start gap-3 sm:items-end">
          <EstadoBadge estado={cuenta.estado} />
          {enBorrador && (
            <>
              <PresentarRendicionDialog
                cuentaId={cuenta.id}
                onPresentada={onActualizada}
                onDesactualizada={refrescar}
                resumen={resumen || undefined}
                deshabilitado={cargando || faltantes.length > 0}
              />
              {!cargando &&
                (faltantes.length > 0 ? (
                  <p className="text-xs text-muted-foreground sm:text-right">
                    Falta cargar: {faltantes.join(' y ')}
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-success">
                    <CheckCircle2 className="size-4" aria-hidden />
                    Documentos completos: ya puede presentar
                  </p>
                ))}
            </>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {!enBorrador && (
          <Alert variant="info">
            <Lock aria-hidden />
            <AlertDescription>
              Esta rendición ya ha sido presentada y se encuentra bloqueada para
              modificaciones. Estado actual: <strong>{etiquetaEstado}</strong>
              {cuenta.presentadaEn && (
                <>
                  . Presentada el {formatearMomento(cuenta.presentadaEn)}
                  {cuenta.presentadaPor &&
                    ` por ${nombreCompleto(cuenta.presentadaPor)}`}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
        <DocumentosDeRendicion
          cuentaMensualId={cuenta.id}
          enBorrador={enBorrador}
          librosBanco={librosBanco}
          ingresosEgresos={ingresosEgresos}
          raci={raci}
          rai={rai}
          onCargarLibroBanco={() => setLibroBancoAbierto(true)}
          onCargarIngresosEgresos={() => setIngresosEgresosAbierto(true)}
          onCargarRaci={() => setRaciAbierto(true)}
          onCargarRai={() => setRaiAbierto(true)}
        />
      </div>

      {enBorrador && (
        <>
          <IngestaDialog
            open={libroBancoAbierto}
            onOpenChange={setLibroBancoAbierto}
            cuentaMensualId={cuenta.id}
            onIngestada={refrescar}
          />
          <IngestarIngresosEgresosDialog
            open={ingresosEgresosAbierto}
            onOpenChange={setIngresosEgresosAbierto}
            cuentaMensualId={cuenta.id}
            onIngestada={refrescar}
            libroExistente={
              ingresosEgresos.data
                ? resumirIngresosEgresos(ingresosEgresos.data)
                : null
            }
          />
          <IngestarRaciDialog
            open={raciAbierto}
            onOpenChange={setRaciAbierto}
            cuentaMensualId={cuenta.id}
            onIngestada={refrescar}
            libroExistente={raci.data ? resumirRaci(raci.data) : null}
          />
          <IngestarRaiDialog
            open={raiAbierto}
            onOpenChange={setRaiAbierto}
            cuentaMensualId={cuenta.id}
            ejercicioFiscal={contexto.ejercicioFiscal}
            onIngestada={refrescar}
            libroExistente={rai.data ? resumirRai(rai.data) : null}
          />
        </>
      )}
    </section>
  );
}
