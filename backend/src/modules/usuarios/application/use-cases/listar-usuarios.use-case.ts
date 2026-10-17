import { Injectable } from '@nestjs/common';
import { UsuarioRepositoryPort } from '../ports/out/usuario-repository.port.js';
import type { UsuarioSinPassword } from '../../domain/entities/usuario.domain.js';

@Injectable()
export class ListarUsuariosUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepositoryPort) {}

  async execute(filtros?: { active?: boolean }): Promise<UsuarioSinPassword[]> {
    return await this.usuarioRepository.listar(filtros);
  }
}
