import type { AuditoriaContext } from '../rules/auditoria-context.js';
import type { ReglaAuditoria } from '../rules/regla-auditoria.interface.js';
import {
  EstadoValidacion,
  type NombreLibro,
  type ResultadoValidacion,
} from '../types/auditoria.types.js';

//un libro está presente si el contexto lo trae y tiene contenido; el Record obliga a mapear cada libro nuevo
const libroPresente: Record<NombreLibro, (c: AuditoriaContext) => boolean> = {
  LIBRO_BANCO: (c) => (c.librosBanco?.length ?? 0) > 0,
  INGRESOS_EGRESOS: (c) => c.ingresosEgresos !== undefined,
  //todavía no existen en el contexto
  RACI: () => false,
  RAI: () => false,
};

//validación progresiva: corre cada regla con lo que haya y informa las que no pudo correr
export class MotorAuditoriaService {
  constructor(private readonly reglas: ReglaAuditoria[]) {}

  ejecutarAuditoriaCompleta(contexto: AuditoriaContext): ResultadoValidacion[] {
    return this.reglas.map((regla) => {
      const faltantes = regla.librosRequeridos.filter(
        (libro) => !libroPresente[libro](contexto),
      );

      if (faltantes.length > 0) {
        return {
          codigoRegla: regla.codigo,
          estado: EstadoValidacion.FALTAN_LIBROS,
          mensaje: `Faltan libros requeridos: ${faltantes.join(', ')}`,
          observaciones: [],
          filasEvaluadas: null,
          librosFaltantes: faltantes,
        };
      }

      return { ...regla.execute(contexto), librosFaltantes: [] };
    });
  }
}
