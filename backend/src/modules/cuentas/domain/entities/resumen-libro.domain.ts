import { TipoLibro } from '../enums/tipo-libro.enum.js';

//lectura para listados: qué trae un libro cargado en una rendición, sin sus transacciones
export class ResumenLibro {
  constructor(
    public readonly id: number,
    public readonly tipo: TipoLibro,
    //N° de cuenta corriente: null en libros banco anteriores a que fuera obligatorio y en un libro de ingresos y egresos que no lo trae
    public readonly numeroCuentaCte: string | null,
    public readonly cantidadTransacciones: number,
    //primera y última fecha de sus transacciones (YYYY-MM-DD); null si ninguna trae fecha (en un libro de ingresos y egresos la fecha es obligatoria)
    public readonly fechaDesde: string | null,
    public readonly fechaHasta: string | null,
  ) {}
}
