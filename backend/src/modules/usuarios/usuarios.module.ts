import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioEntity } from './infrastructure/entities/usuario.entity.js';
import { UsuarioRepositoryPort } from './application/ports/out/usuario-repository.port.js';
import { TypeOrmUsuarioRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-usuario.repository.js';

@Module({
  imports: [TypeOrmModule.forFeature([UsuarioEntity])],
  providers: [
    {
      provide: UsuarioRepositoryPort,
      useClass: TypeOrmUsuarioRepositoryAdapter,
    },
  ],
  exports: [UsuarioRepositoryPort],
})
export class UsuariosModule {}
