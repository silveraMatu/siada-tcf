import { toast } from 'sonner';

import { getErrorMessage } from '@/lib/api';
import { asegurarResponsable } from '@/features/responsables/api/responsables.api';
import type { Usuario } from '../types';

/**
 * Un usuario con rol RESPONSABLE necesita su registro de Responsable para poder
 * vincularse a un organismo. Si ya lo tiene no pasa nada. Si falla, la operación
 * principal (activar / cambiar roles) ya se hizo, así que solo se avisa.
 */
export async function registrarResponsableSiCorresponde(
  usuario: Usuario,
  accion: string,
): Promise<void> {
  if (!usuario.roles.includes('RESPONSABLE')) return;
  try {
    await asegurarResponsable(usuario.id);
  } catch (error) {
    toast.warning(
      `${usuario.nombre} ${usuario.apellido} ${accion}, pero no se pudo registrar como responsable: ${getErrorMessage(error)}`,
    );
  }
}
