import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { TransaccionIngresoEgreso } from './transaccion-ingreso-egreso.domain.js';

//libro de Ingresos y Egresos de una rendición mensual; el organismo, el ejercicio, el mes y el estado
//salen de su cuenta mensual
export class IngresosEgresos {
  constructor(
    public readonly cuentaMensualId: number,
    //dato informativo del encabezado del archivo, puede faltar hasta confirmar aspectos
    public readonly numeroCuentaCte: string | null,
    public readonly transacciones: TransaccionIngresoEgreso[],
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
    //quién lo subió y sha256 de su contenido (ver calcularHashContenido); la fecha de subida es fechaCreacion
    public readonly subidoPorId?: number,
    public readonly hashContenido?: string,
    //nombre de quien lo subió, para mostrarlo
    public readonly subidoPor?: ResumenPersona | null,
  ) {}
}
