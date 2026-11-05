import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { TransaccionRaci } from './transaccion-raci.domain.js';

//libro RACI de una rendición mensual: los asientos del mes; el organismo, el ejercicio, el mes y el estado
//salen de su cuenta mensual. Las partidas presupuestarias (con su total autorizado) serán un modelo aparte
export class Raci {
  constructor(
    public readonly cuentaMensualId: number,
    public readonly transacciones: TransaccionRaci[],
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
    //quién lo subió y sha256 de su contenido (ver calcularHashContenido); la fecha de subida es fechaCreacion
    public readonly subidoPorId?: number,
    public readonly hashContenido?: string,
    //nombre de quien lo subió, para mostrarlo
    public readonly subidoPor?: ResumenPersona | null,
  ) {}
}
