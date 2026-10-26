import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { ContextoForm } from '@/features/cuentas/components/ContextoForm';
import { CuentaMensualDetalle } from '@/features/cuentas/components/CuentaMensualDetalle';
import type { ContextoCuenta, CuentaMensual } from '@/features/cuentas/types';

interface CuentaResuelta {
  cuenta: CuentaMensual;
  contexto: ContextoCuenta;
}

export function LibroBancoPage() {
  const [resuelta, setResuelta] = useState<CuentaResuelta | null>(null);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rendición mensual"
        description="Seleccione el período y cargue los documentos de su organismo."
      />

      <ContextoForm
        onResuelta={(cuenta, contexto) => setResuelta({ cuenta, contexto })}
        onCambio={() => setResuelta(null)}
      />

      {resuelta && (
        <CuentaMensualDetalle
          cuenta={resuelta.cuenta}
          contexto={resuelta.contexto}
          onActualizada={(cuenta) =>
            setResuelta((actual) => actual && { ...actual, cuenta })
          }
        />
      )}
    </div>
  );
}
