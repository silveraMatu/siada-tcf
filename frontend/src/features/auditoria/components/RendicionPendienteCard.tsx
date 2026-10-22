import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MESES } from '@/features/cuentas/constants';
import type { CuentaMensualListada } from '@/features/cuentas/types';

export function RendicionPendienteCard({
  cuenta,
}: {
  cuenta: CuentaMensualListada;
}) {
  const periodo = `${MESES[cuenta.mes - 1]} ${cuenta.ejercicioFiscal}`;

  return (
    <li>
      <Card className="flex h-full flex-col justify-between gap-6 p-6 shadow-sm">
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold leading-snug tracking-tight">
            {cuenta.organismoNombre}
          </h2>
          <p className="text-sm text-muted-foreground">{periodo}</p>
        </div>
        <Button asChild className="w-full sm:w-auto sm:self-start">
          <Link
            to={`/auditoria/cuenta/${cuenta.id}`}
            aria-label={`Auditar Rendición de ${cuenta.organismoNombre}, ${periodo}`}
          >
            Auditar Rendición
            <ArrowRight />
          </Link>
        </Button>
      </Card>
    </li>
  );
}
