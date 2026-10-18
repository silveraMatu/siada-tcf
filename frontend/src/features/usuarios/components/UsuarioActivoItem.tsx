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
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuthStore } from '@/features/auth/hooks/useAuth';
import { useActualizarRoles } from '../hooks/useActualizarRoles';
import { useDesactivarUsuario } from '../hooks/useDesactivarUsuario';
import { restriccionPropia, type Rol, type Usuario } from '../types';
import { RolesSelector } from './RolesSelector';

const formatoFecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' });

const mismosRoles = (a: readonly Rol[], b: readonly Rol[]) =>
  a.length === b.length && a.every((rol) => b.includes(rol));

export function UsuarioActivoItem({ usuario }: { usuario: Usuario }) {
  const [rolesSeleccionados, setRolesSeleccionados] = useState<Rol[]>(
    usuario.roles,
  );
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const sub = useAuthStore((s) => s.user?.sub);
  const actualizar = useActualizarRoles();
  const desactivar = useDesactivarUsuario();

  const { esPropia, noPuedeDesactivar, noPuedeQuitarseAdmin } =
    restriccionPropia(usuario.id, sub, rolesSeleccionados);
  const ocupado = actualizar.isPending || desactivar.isPending;
  const sinRoles = rolesSeleccionados.length === 0;
  const sinCambios = mismosRoles(rolesSeleccionados, usuario.roles);

  const ayuda = sinRoles
    ? 'Seleccione al menos un rol'
    : noPuedeQuitarseAdmin
      ? 'No puede quitarse el rol de administrador'
      : null;

  return (
    <li className="flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="truncate font-medium">
          {usuario.nombre} {usuario.apellido}
          {esPropia && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (usted)
            </span>
          )}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {usuario.email}
        </p>
        <p className="text-sm text-muted-foreground">
          DNI {usuario.dni} · Alta el{' '}
          {formatoFecha.format(new Date(usuario.fechaCreacion))}
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:items-end">
        <RolesSelector
          value={rolesSeleccionados}
          onChange={setRolesSeleccionados}
          disabled={ocupado}
        />
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {(ayuda || noPuedeDesactivar) && (
            <span className="text-sm text-muted-foreground">
              {ayuda ?? 'No puede desactivar su propia cuenta'}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            disabled={ocupado || sinCambios || sinRoles || noPuedeQuitarseAdmin}
            onClick={() =>
              actualizar.mutate({ id: usuario.id, roles: rolesSeleccionados })
            }
          >
            Actualizar Roles
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={ocupado || noPuedeDesactivar}
            onClick={() => setDialogAbierto(true)}
          >
            Desactivar Cuenta
          </Button>
        </div>
      </div>

      <AlertDialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que deseas desactivar la cuenta de {usuario.nombre}{' '}
              {usuario.apellido}? No podrá ingresar al sistema y volverá a la
              lista de solicitudes pendientes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: 'destructive' })}
              onClick={() =>
                // Se envían los roles guardados en el servidor, no la selección sin guardar.
                desactivar.mutate({ id: usuario.id, roles: usuario.roles })
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
