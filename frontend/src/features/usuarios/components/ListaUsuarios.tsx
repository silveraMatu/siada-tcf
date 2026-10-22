import { isAxiosError } from 'axios';
import { AlertCircle, Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api';
import type { Usuario } from '../types';

interface QueryUsuarios {
  data: Usuario[] | undefined;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  isRefetching: boolean;
}

interface ListaUsuariosProps {
  query: QueryUsuarios;
  vacioIcono?: LucideIcon;
  vacioTitulo: string;
  vacioTexto: string;
  /** Texto del contador, p. ej. ["1 solicitud pendiente", "N solicitudes pendientes"]. */
  contador: (cantidad: number) => string;
  renderItem: (usuario: Usuario) => ReactNode;
}

function mensajeDeError(error: unknown): string {
  if (isAxiosError(error) && error.response?.status === 401) {
    return 'Su sesión venció o no es válida. Inicie sesión para ver los usuarios.';
  }
  return getErrorMessage(error);
}

/** Estados comunes de una lista de usuarios: cargando, error, vacía y con datos. */
export function ListaUsuarios({
  query,
  vacioIcono = Inbox,
  vacioTitulo,
  vacioTexto,
  contador,
  renderItem,
}: ListaUsuariosProps) {
  const { data, isPending, isError, error, refetch, isRefetching } = query;

  if (isPending) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-4 rounded-xl border border-danger-border bg-danger-subtle p-5 text-danger"
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
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={vacioIcono}
        title={vacioTitulo}
        description={vacioTexto}
      />
    );
  }

  return (
    <section className="space-y-4">
      <p className="text-sm text-muted-foreground">{contador(data.length)}</p>
      <ul className="space-y-4">{data.map(renderItem)}</ul>
    </section>
  );
}
