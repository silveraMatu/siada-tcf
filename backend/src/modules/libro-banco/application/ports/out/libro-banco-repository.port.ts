import { LibroBanco } from '../../../domain/entities/libro-banco.domain.js';

export abstract class LibroBancoRepositoryPort {

  abstract guardar(libroBanco: LibroBanco): Promise<LibroBanco>;

  // abstract existeCuentaMensual(cuentaMensualId: number): Promise<boolean>;

  abstract buscarPorCuentaMensualId(cuentaMensualId: number): Promise<LibroBanco | null>;
}