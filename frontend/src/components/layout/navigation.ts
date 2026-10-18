import { Building2, FileSpreadsheet, UserCheck, Users } from 'lucide-react';

export const navigationGroups = [
  {
    label: 'Auditoría',
    items: [
      { to: '/organismos', label: 'Organismos', icon: Building2 },
      { to: '/responsables', label: 'Responsables', icon: Users },
      {
        to: '/libro-banco',
        label: 'Ingesta Libro Banco',
        icon: FileSpreadsheet,
      },
    ],
  },
  {
    label: 'Administración',
    // Por ahora visible para todos; más adelante solo para administradores.
    items: [
      { to: '/admin/usuarios', label: 'Solicitudes de Acceso', icon: UserCheck },
    ],
  },
] as const;
