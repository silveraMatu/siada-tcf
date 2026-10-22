import { LibroBanco } from '../../../domain/entities/libro-banco.domain.js';

export abstract class LibroBancoRepositoryPort {
  //inserta un libro nuevo; lanza LibroBancoDuplicadoError si ya hay uno con el mismo N° de cuenta en esa cuenta mensual
  abstract guardar(libroBanco: LibroBanco): Promise<LibroBanco>;

  //el libro de esa cuenta corriente dentro de la cuenta mensual, con sus transacciones; null si no hay
  abstract buscarPorCuentaYNumero(
    cuentaMensualId: number,
    numeroCuentaCte: string,
  ): Promise<LibroBanco | null>;

  //borra el libro existente (con sus transacciones) y guarda el nuevo en una sola transacción
  abstract reemplazar(
    idExistente: number,
    nuevo: LibroBanco,
  ): Promise<LibroBanco>;

  abstract buscarPorCuentaMensualId(
    cuentaMensualId: number,
  ): Promise<LibroBanco[]>;
}
