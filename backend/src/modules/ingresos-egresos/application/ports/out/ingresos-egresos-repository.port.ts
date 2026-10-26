import { IngresosEgresos } from '../../../domain/entities/ingresos-egresos.domain.js';

export abstract class IngresosEgresosRepositoryPort {
  //inserta el libro; lanza IngresosEgresosDuplicadoError si esa cuenta mensual ya tiene uno
  abstract guardar(libro: IngresosEgresos): Promise<IngresosEgresos>;

  //el libro de la cuenta mensual con sus transacciones; null si no hay
  abstract buscarPorCuentaMensualId(
    cuentaMensualId: number,
  ): Promise<IngresosEgresos | null>;

  //borra el libro existente (con sus transacciones) y guarda el nuevo en una sola transacción
  abstract reemplazar(
    idExistente: number,
    nuevo: IngresosEgresos,
  ): Promise<IngresosEgresos>;
}
