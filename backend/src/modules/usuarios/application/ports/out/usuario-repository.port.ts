import { Usuario } from '../../../domain/entities/usuario.domain.js';

export abstract class UsuarioRepositoryPort {
  //lanza ConflictException si el email o el cuitDni ya existen
  abstract crear(usuario: Usuario): Promise<Usuario>;

  abstract buscarPorEmail(email: string): Promise<Usuario | null>;

  abstract buscarPorCuitDni(cuitDni: string): Promise<Usuario | null>;
}
