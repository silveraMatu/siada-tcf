import { isAxiosError } from 'axios';
import { AlertCircle, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api';
import { useUsuariosPendientes } from '../hooks/useUsuariosPendientes';
import { UsuarioPendienteItem } from './UsuarioPendienteItem';

function mensajeDeError(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 401) {
    return 'Debe iniciar sesión como administrador para ver las solicitudes.';
  }
  return getErrorMessage(error);
}

export function AdminUsuariosPage() {
  const { data, isPending, isError, error, refetch, isRefetching } =
    useUsuariosPendientes();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Solicitudes de Acceso"
        description="Revise las cuentas registradas, asigne sus roles y habilite su ingreso al sistema."
      />

      {isPending && (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {isError && (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
        >
          <p className="flex items-start gap-2 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {mensajeDeError(error)}
          </p>
          <div className="flex gap-2">
            {isAxiosError(error) && error.response?.status === 401 && (
              <Button asChild size="sm">
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              Reintentar
            </Button>
          </div>
        </div>
      )}

      {data && data.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50">
            <Check className="size-6 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <p className="font-medium">No hay solicitudes pendientes</p>
            <p className="text-sm text-muted-foreground">
              Las nuevas solicitudes de acceso aparecerán aquí.
            </p>
          </div>
        </div>
      )}

      {data && data.length > 0 && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {data.length === 1
              ? '1 solicitud pendiente'
              : `${data.length} solicitudes pendientes`}
          </p>
          <ul className="space-y-3">
            {data.map((usuario) => (
              <UsuarioPendienteItem key={usuario.id} usuario={usuario} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
