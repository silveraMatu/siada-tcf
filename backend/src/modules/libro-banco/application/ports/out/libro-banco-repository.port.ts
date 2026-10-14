import { LibroBanco } from '../../../domain/entities/libro-banco.domain.js';

export abstract class LibroBancoRepositoryPort {

  abstract guardar(libroBanco: LibroBanco): Promise<LibroBanco>;

  abstract buscarTodos(): Promise<LibroBanco[]>;

  abstract buscarPorCuentaMensualId(cuentaMensualId: number): Promise<LibroBanco[]>;
}