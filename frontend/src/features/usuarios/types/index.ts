export type Rol = 'ADMIN' | 'JUEZ_TRAMITE' | 'AUDITOR' | 'RESPONSABLE';

/** Orden en que se muestran (y se envían) los roles. */
export const ROLES: readonly Rol[] = [
  'ADMIN',
  'JUEZ_TRAMITE',
  'AUDITOR',
  'RESPONSABLE',
];

export const ROL_LABEL: Record<Rol, string> = {
  ADMIN: 'Administrador',
  JUEZ_TRAMITE: 'Juez de Trámite',
  AUDITOR: 'Auditor',
  RESPONSABLE: 'Responsable',
};

export interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  active: boolean;
  roles: Rol[];
  fechaCreacion: string;
}

/** Agrega el rol si no está y lo quita si está, manteniendo el orden de `ROLES`. No muta `roles`. */
export function alternarRol(roles: Rol[], rol: Rol): Rol[] {
  const seleccionados = roles.includes(rol)
    ? roles.filter((r) => r !== rol)
    : [...roles, rol];
  return ROLES.filter((r) => seleccionados.includes(r));
}
