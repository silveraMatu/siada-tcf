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
import { useActivarUsuario } from '../hooks/useActivarUsuario';
import { ROL_LABEL, type Rol, type Usuario } from '../types';
import { RolesSelector } from './RolesSelector';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });

export function UsuarioPendienteItem({ usuario }: { usuario: Usuario }) {
  // Un usuario desactivado conserva sus roles previos y vuelve con ellos ya marcados.
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Rol[]>(
    usuario.roles,
  );
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const activar = useActivarUsuario();

  const sinRoles = rolesSeleccionados.length === 0;

  return (
    <li className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">
          {usuario.nombre} {usuario.apellido}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {usuario.email}
        </p>
        <p className="text-sm text-muted-foreground">
          DNI {usuario.dni} · Solicitado el{' '}
          {formatoFecha.format(new Date(usuario.fechaCreacion))}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:items-end">
        <RolesSelector
          value={rolesSeleccionados}
          onChange={setRolesSeleccionados}
        />
        <div className="flex items-center gap-3">
          {sinRoles && (
            <span className="text-sm text-muted-foreground">
              Seleccione al menos un rol
            </span>
          )}
          <Button
            size="sm"
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
