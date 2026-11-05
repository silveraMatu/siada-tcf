import { Raci } from '../../../domain/entities/raci.domain.js';

export abstract class RaciRepositoryPort {
  //inserta el libro; lanza RaciDuplicadoError si esa cuenta mensual ya tiene uno
  abstract guardar(libro: Raci): Promise<Raci>;

  //el libro de la cuenta mensual con sus transacciones; null si no hay
  abstract buscarPorCuentaMensualId(
    cuentaMensualId: number,
  ): Promise<Raci | null>;

  //borra el libro existente (con sus transacciones) y guarda el nuevo en una sola transacción
  abstract reemplazar(idExistente: number, nuevo: Raci): Promise<Raci>;
}
