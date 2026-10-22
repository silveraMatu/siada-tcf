import { TipoLibro } from '../enums/tipo-libro.enum.js';

//lectura para listados: qué trae un libro cargado en una rendición, sin sus transacciones
export class ResumenLibro {
  constructor(
    public readonly id: number,
    public readonly tipo: TipoLibro,
    //el N° de cuenta corriente solo existe en el libro banco; null en libros anteriores a que fuera obligatorio
    public readonly numeroCuentaCte: string | null,
    public readonly cantidadTransacciones: number,
    //primera y última fecha de sus transacciones (YYYY-MM-DD); null si ninguna trae fecha
    public readonly fechaDesde: string | null,
    public readonly fechaHasta: string | null,
  ) {}
}
