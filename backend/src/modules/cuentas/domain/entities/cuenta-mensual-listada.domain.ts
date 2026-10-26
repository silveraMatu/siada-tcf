import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { EstadoCuentaMensual } from '../enums/estado-cuenta-mensual.enum.js';
import { ResumenLibro } from './resumen-libro.domain.js';

//lectura para listados: la cuenta mensual con el organismo y el ejercicio a los que pertenece
//y un resumen de los libros cargados en ella
export class CuentaMensualListada {
  constructor(
    public readonly id: number,
    public readonly mes: number,
    public readonly cuentaAnualId: number,
    public readonly estado: EstadoCuentaMensual,
    public readonly fechaCreacion: Date,
    public readonly organismoId: number,
    public readonly organismoNombre: string,
    public readonly ejercicioFiscal: number,
    public readonly libros: ResumenLibro[],
    public readonly presentadaPorId: number | null,
    public readonly presentadaEn: Date | null,
    public readonly presentadaPor: ResumenPersona | null,
  ) {}
}
