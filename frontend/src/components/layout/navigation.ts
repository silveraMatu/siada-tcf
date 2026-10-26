import {
  Building2,
  Activity,
  ClipboardCheck,
  FileSpreadsheet,
  UserCheck,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { Rol } from '@/features/usuarios/types';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Sin esta propiedad el ítem es público; con `[]` no lo ve nadie. */
  allowedRoles?: readonly Rol[];
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
}

export const navigationGroups: readonly NavGroup[] = [
  {
    label: 'Gestión',
    items: [
      {
        to: '/organismos',
        label: 'Organismos',
        icon: Building2,
        allowedRoles: ['ADMIN', 'JUEZ_TRAMITE'],
      },
      {
        to: '/asignacion-auditores',
        label: 'Asignación de auditores',
        icon: UserCog,
        allowedRoles: ['ADMIN', 'JUEZ_TRAMITE'],
      },
      {
        to: '/responsables',
        label: 'Responsables',
        icon: Users,
        allowedRoles: ['ADMIN'],
      },
      {
        to: '/libro-banco',
        label: 'Rendición mensual',
        icon: FileSpreadsheet,
        allowedRoles: ['RESPONSABLE'],
      },
      {
        to: '/auditoria',
        label: 'Auditoría',
        icon: ClipboardCheck,
        allowedRoles: ['AUDITOR', 'ADMIN'],
      },
    ],
  },
  {
    label: 'Administración',
    items: [
      {
        to: '/admin/usuarios',
        label: 'Solicitudes de Acceso',
        icon: UserCheck,
        allowedRoles: ['ADMIN'],
      },
    ],
  },
  {
    label: 'Supervisión',
    items: [
      {
        to: '/actividad',
        label: 'Bitácora de actividad',
        icon: Activity,
        // solo lee la bitácora quien tiene el rol SUPERVISOR: ni el administrador la ve
        allowedRoles: ['SUPERVISOR'],
      },
    ],
  },
];

/** Un ítem sin `allowedRoles` es público; si los tiene, hace falta al menos un rol coincidente. */
export function puedeVer(
  item: Pick<NavItem, 'allowedRoles'>,
  roles: readonly string[] | null | undefined,
): boolean {
  if (!item.allowedRoles) return true;
  const propios = Array.isArray(roles) ? roles : [];
  return item.allowedRoles.some((rol) => propios.includes(rol));
}

/** Deja solo los ítems visibles para esos roles y descarta los grupos que quedan vacíos. */
export function filtrarNavegacion(
  grupos: readonly NavGroup[],
  roles: readonly string[] | null | undefined,
): NavGroup[] {
  return grupos
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.filter((item) => puedeVer(item, roles)),
    }))
    .filter((grupo) => grupo.items.length > 0);
}

/**
 * Roles que pueden entrar a una sección del menú, para que las rutas usen la misma fuente que el menú.
 * `undefined` = cualquier usuario con sesión. Lanza si la ruta no está en el menú (error de programación).
 */
export function rolesPermitidos(ruta: string): readonly Rol[] | undefined {
  const item = navigationGroups
    .flatMap((grupo) => grupo.items)
    .find((candidato) => candidato.to === ruta);
  if (!item) {
    throw new Error(`La ruta ${ruta} no figura en navigationGroups`);
  }
  return item.allowedRoles;
}

/** Primera sección que el usuario puede ver; `/` si no tiene ninguna. */
export function rutaInicial(
  roles: readonly string[] | null | undefined,
): string {
  return filtrarNavegacion(navigationGroups, roles)[0]?.items[0]?.to ?? '/';
}
