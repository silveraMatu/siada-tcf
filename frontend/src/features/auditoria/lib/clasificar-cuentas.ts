import type { CuentaMensualListada } from '@/features/cuentas/types';

/** Las rendiciones del auditor según en qué punto de su trabajo están. */
export interface CuentasClasificadas {
  /** Presentadas y todavía sin tomar. */
  paraAuditar: CuentaMensualListada[];
  /** Ya auditadas por el motor, con la revisión de los hallazgos en curso. */
  enCurso: CuentaMensualListada[];
  /** Auditoría cerrada: sin observaciones confirmadas o con ellas. */
  cerradas: CuentaMensualListada[];
}

/**
 * Reparte las rendiciones por estado. Las que siguen en borrador no son del auditor (el responsable
 * todavía las está armando), y un estado que no conocemos tampoco se muestra en ninguna pestaña.
 */
export function clasificarCuentas(
  cuentas: readonly CuentaMensualListada[],
): CuentasClasificadas {
  const resultado: CuentasClasificadas = {
    paraAuditar: [],
    enCurso: [],
    cerradas: [],
  };
  for (const cuenta of cuentas) {
    if (cuenta.estado === 'LISTO_PARA_AUDITAR')
      resultado.paraAuditar.push(cuenta);
    else if (cuenta.estado === 'EN_AUDITORIA') resultado.enCurso.push(cuenta);
    else if (
      cuenta.estado === 'AUDITADA' ||
      cuenta.estado === 'CON_OBSERVACIONES'
    ) {
      resultado.cerradas.push(cuenta);
    }
  }
  return resultado;
}
