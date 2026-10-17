import { Building2, FileSpreadsheet, Users } from 'lucide-react';

export const navigation = [
  { to: '/organismos', label: 'Organismos', icon: Building2 },
  { to: '/responsables', label: 'Responsables', icon: Users },
  { to: '/libro-banco', label: 'Ingesta Libro Banco', icon: FileSpreadsheet },
] as const;
