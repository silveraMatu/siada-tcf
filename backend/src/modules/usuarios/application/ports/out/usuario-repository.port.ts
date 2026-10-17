import {
  Usuario,
  type UsuarioSinPassword,
} from '../../../domain/entities/usuario.domain.js';

export abstract class UsuarioRepositoryPort {
  //lanza ConflictException si el email o el cuitDni ya existen
  abstract crear(usuario: Usuario): Promise<Usuario>;

  abstract buscarPorEmail(email: string): Promise<Usuario | null>;

  abstract buscarPorCuitDni(cuitDni: string): Promise<Usuario | null>;

  //los métodos siguientes nunca exponen la contraseña
  abstract buscarPorId(id: number): Promise<UsuarioSinPassword | null>;

  abstract actualizar(
    id: number,
    datos: Partial<UsuarioSinPassword>,
  ): Promise<UsuarioSinPassword>;

  //ordenados por id ascendente; sin filtro `active` devuelve todos
  abstract listar(filtros?: {
    active?: boolean;
  }): Promise<UsuarioSinPassword[]>;
}
