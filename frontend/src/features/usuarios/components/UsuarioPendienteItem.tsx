import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useActivarUsuario } from '../hooks/useActivarUsuario';
import { alternarRol, ROL_LABEL, ROLES, type Rol, type Usuario } from '../types';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });

export function UsuarioPendienteItem({ usuario }: { usuario: Usuario }) {
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Rol[]>([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const activar = useActivarUsuario();

  const sinRoles = rolesSeleccionados.length === 0;

  function alternar(rol: Rol) {
    setRolesSeleccionados((actuales) => alternarRol(actuales, rol));
  }

  return (
    <li className="flex flex-col gap-5 rounded-xl border bg-card p-5 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">
          {usuario.nombre} {usuario.apellido}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {usuario.email}
        </p>
        <p className="text-xs text-muted-foreground">
          DNI {usuario.dni} · Solicitado el{' '}
          {formatoFecha.format(new Date(usuario.fechaCreacion))}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:items-end">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Roles">
          {ROLES.map((rol) => {
            const seleccionado = rolesSeleccionados.includes(rol);
            return (
              <Badge
                key={rol}
                role="button"
                tabIndex={0}
                aria-pressed={seleccionado}
                variant={seleccionado ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer select-none px-3 py-1 font-medium',
                  !seleccionado && 'text-muted-foreground hover:bg-accent',
                )}
                onClick={() => alternar(rol)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    alternar(rol);
                  }
                }}
              >
                {ROL_LABEL[rol]}
              </Badge>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {sinRoles && (
            <span className="text-xs text-muted-foreground">
              Seleccione al menos un rol
            </span>
          )}
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            disabled={sinRoles || activar.isPending}
            onClick={() => setDialogAbierto(true)}
          >
            Activar
          </Button>
        </div>
      </div>

      <AlertDialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Activación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que deseas activar a este usuario con los roles
              seleccionados? Podrá ingresar inmediatamente al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-wrap gap-2">
            {rolesSeleccionados.map((rol) => (
              <Badge key={rol}>{ROL_LABEL[rol]}</Badge>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                activar.mutate({ id: usuario.id, roles: rolesSeleccionados })
              }
            >
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
