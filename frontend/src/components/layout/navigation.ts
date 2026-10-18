import {
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  UserCheck,
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
        to: '/responsables',
        label: 'Responsables',
        icon: Users,
        allowedRoles: ['ADMIN'],
      },
      {
        to: '/libro-banco',
        label: 'Ingesta Libro Banco',
        icon: FileSpreadsheet,
        allowedRoles: ['RESPONSABLE'],
      },
      {
        to: '/auditoria',
        label: 'Auditoría',
        icon: ClipboardCheck,
        allowedRoles: ['AUDITOR', 'ADMIN', 'JUEZ_TRAMITE'],
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

/** Primera sección que el usuario puede ver; `/` si no tiene ninguna. */
export function rutaInicial(roles: readonly string[] | null | undefined): string {
  return filtrarNavegacion(navigationGroups, roles)[0]?.items[0]?.to ?? '/';
}
