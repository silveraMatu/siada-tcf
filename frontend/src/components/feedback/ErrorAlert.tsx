import { isAxiosError } from 'axios';
import { AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api';

interface ErrorAlertProps {
  error: unknown;
  onRetry?: () => void;
  retrying?: boolean;
}

/** Aviso de error de una consulta. Ante un 401 ofrece ir a iniciar sesión. */
export function ErrorAlert({ error, onRetry, retrying }: ErrorAlertProps) {
  const sinSesion = isAxiosError(error) && error.response?.status === 401;

  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-xl border border-danger-border bg-danger-subtle p-5 text-danger"
    >
      <p className="flex items-start gap-2 text-sm">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        {sinSesion
          ? 'Su sesión venció o no es válida. Inicie sesión para ver esta información.'
          : getErrorMessage(error)}
      </p>
      <div className="flex gap-2">
        {sinSesion && (
          <Button asChild size="sm">
            <Link to="/login">Iniciar sesión</Link>
          </Button>
        )}
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={retrying}
          >
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
