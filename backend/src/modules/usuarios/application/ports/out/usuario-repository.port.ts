import {
  Usuario,
  type UsuarioSinPassword,
} from '../../../domain/entities/usuario.domain.js';

//solo el estado y los roles se pueden cambiar por la administración de usuarios
export type CambiosAdministrativos = Partial<
  Pick<UsuarioSinPassword, 'active' | 'roles'>
>;

export abstract class UsuarioRepositoryPort {
  //lanza ConflictException si el email o el dni ya existen
  abstract crear(usuario: Usuario): Promise<Usuario>;

  abstract buscarPorEmail(email: string): Promise<Usuario | null>;

  abstract buscarPorDni(dni: string): Promise<Usuario | null>;

  //los métodos siguientes nunca exponen la contraseña
  abstract buscarPorId(id: number): Promise<UsuarioSinPassword | null>;

  abstract actualizar(
    id: number,
    datos: CambiosAdministrativos,
  ): Promise<UsuarioSinPassword>;

  //ordenados por id ascendente; sin filtro `active` devuelve todos
  abstract listar(filtros?: {
    active?: boolean;
  }): Promise<UsuarioSinPassword[]>;
}
