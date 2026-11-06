import { Rai } from '../../../domain/entities/rai.domain.js';

export abstract class RaiRepositoryPort {
  //inserta el libro; lanza RaiDuplicadoError si esa cuenta mensual ya tiene uno
  abstract guardar(libro: Rai): Promise<Rai>;

  //el libro de la cuenta mensual con sus transacciones; null si no hay
  abstract buscarPorCuentaMensualId(
    cuentaMensualId: number,
  ): Promise<Rai | null>;

  //borra el libro existente (con sus transacciones) y guarda el nuevo en una sola transacción
  abstract reemplazar(idExistente: number, nuevo: Rai): Promise<Rai>;
}
