import { Injectable } from '@nestjs/common';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import type { UsuarioSinPassword } from '../../../usuarios/domain/entities/usuario.domain.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';

//usuarios que se pueden asignar a un organismo: activos y con el rol AUDITOR
@Injectable()
export class ListarAuditoresUseCase {
  constructor(private readonly usuarioRepository: UsuarioRepositoryPort) {}

  async execute(): Promise<UsuarioSinPassword[]> {
    const activos = await this.usuarioRepository.listar({ active: true });
    return activos.filter((usuario) => usuario.roles.includes(Rol.AUDITOR));
  }
}
