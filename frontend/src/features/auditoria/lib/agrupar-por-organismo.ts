import type { CuentaMensualListada } from '@/features/cuentas/types';

export interface GrupoOrganismo {
  organismoId: number;
  organismoNombre: string;
  /** Sus rendiciones pendientes, la más reciente primero. */
  rendiciones: CuentaMensualListada[];
}

/** Agrupa las rendiciones por organismo (orden alfabético), cada una con sus meses de más nuevo a más viejo. */
export function agruparPorOrganismo(
  cuentas: readonly CuentaMensualListada[],
): GrupoOrganismo[] {
  const grupos = new Map<number, GrupoOrganismo>();

  for (const cuenta of cuentas) {
    const grupo = grupos.get(cuenta.organismoId) ?? {
      organismoId: cuenta.organismoId,
      organismoNombre: cuenta.organismoNombre,
      rendiciones: [],
    };
    grupo.rendiciones.push(cuenta);
    grupos.set(cuenta.organismoId, grupo);
  }

  return [...grupos.values()]
    .map((grupo) => ({
      ...grupo,
      rendiciones: [...grupo.rendiciones].sort(
        (a, b) => b.ejercicioFiscal - a.ejercicioFiscal || b.mes - a.mes,
      ),
    }))
    .sort((a, b) => a.organismoNombre.localeCompare(b.organismoNombre, 'es'));
}
