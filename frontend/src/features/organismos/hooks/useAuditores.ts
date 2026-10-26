import { useQuery } from '@tanstack/react-query';

import { obtenerAuditores } from '../api/organismos.api';
import { organismosKeys } from './organismos.keys';

/** `enabled: false` evita pedir los candidatos hasta que se abre el diálogo que los necesita. */
export function useAuditores({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: organismosKeys.auditores,
    queryFn: obtenerAuditores,
    enabled,
  });
}
