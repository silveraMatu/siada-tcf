import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioEntity } from './infrastructure/entities/usuario.entity.js';
import { UsuarioRepositoryPort } from './application/ports/out/usuario-repository.port.js';
import { TypeOrmUsuarioRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-usuario.repository.js';
import { UsuariosController } from './infrastructure/http/usuarios.controller.js';
import { ListarUsuariosUseCase } from './application/use-cases/listar-usuarios.use-case.js';
import { ActivarUsuarioYAsignarRolesUseCase } from './application/use-cases/activar-usuario-y-asignar-roles.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioEntity])],
  controllers: [UsuariosController],
  providers: [
    ListarUsuariosUseCase,
    ActivarUsuarioYAsignarRolesUseCase,
    {
      provide: UsuarioRepositoryPort,
      useClass: TypeOrmUsuarioRepositoryAdapter,
    },
  ],
  exports: [UsuarioRepositoryPort],
})
export class UsuariosModule {}
