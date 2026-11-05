import type {
  ResultadoValidacion,
  ResumenResultados,
} from '../types/auditoria.types';
import { ordenarPorCodigo, resumirResultados } from './resumir-resultados';

export interface GrupoReglas {
  /** Letra del tipo de validación, o `otras` para un código que no conocemos. */
  clave: string;
  titulo: string;
  resultados: ResultadoValidacion[];
  resumen: ResumenResultados;
}

/** Tipos de validación del motor, en el orden en que se muestran. */
const TIPOS: { clave: string; titulo: string }[] = [
  { clave: 'V', titulo: 'Validaciones internas' },
  { clave: 'C', titulo: 'Cruces entre libros' },
  { clave: 'P', titulo: 'Integridad de cheques' },
  { clave: 'F', titulo: 'Coherencia de fechas' },
];

/**
 * Reparte las reglas por la letra de su código (V, C, P, F) y las ordena dentro de cada grupo por
 * número. Un código con otra letra va a «Otras reglas»; un grupo sin reglas no se devuelve.
 */
export function agruparPorTipo(
  resultados: readonly ResultadoValidacion[],
): GrupoReglas[] {
  const conocidas = new Set(TIPOS.map((t) => t.clave));
  const definiciones = [...TIPOS, { clave: 'otras', titulo: 'Otras reglas' }];

  return definiciones
    .map(({ clave, titulo }) => {
      const delGrupo = resultados.filter((r) => {
        const letra = r.codigoRegla.charAt(0).toUpperCase();
        return clave === 'otras' ? !conocidas.has(letra) : letra === clave;
      });
      return {
        clave,
        titulo,
        resultados: ordenarPorCodigo(delGrupo),
        resumen: resumirResultados(delGrupo),
      };
    })
    .filter((grupo) => grupo.resultados.length > 0);
}
