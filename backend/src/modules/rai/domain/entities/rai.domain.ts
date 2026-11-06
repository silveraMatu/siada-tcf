import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { TransaccionRai } from './transaccion-rai.domain.js';

//libro RAI de una rendición mensual: los asientos de ingresos del mes; el organismo, el ejercicio, el mes y el
//estado salen de su cuenta mensual. Las partidas (con su total autorizado) serán un modelo aparte
export class Rai {
  constructor(
    public readonly cuentaMensualId: number,
    public readonly transacciones: TransaccionRai[],
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
    //quién lo subió y sha256 de su contenido (ver calcularHashContenido); la fecha de subida es fechaCreacion
    public readonly subidoPorId?: number,
    public readonly hashContenido?: string,
    //nombre de quien lo subió, para mostrarlo
    public readonly subidoPor?: ResumenPersona | null,
  ) {}
}
