import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';

/** Marcador de la vista de auditoría de una rendición; se completa en la próxima etapa. */
export function AuditarCuentaPage() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <Link
        to="/auditoria"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Volver a las rendiciones pendientes
      </Link>
      <PageHeader
        title="Auditar rendición"
        description={`Rendición n.º ${id}. La revisión estará disponible próximamente.`}
      />
    </div>
  );
}
