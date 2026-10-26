import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganismoEntity } from './infrastructure/entities/organismo.entity.js';
import { OrganismoRepositoryPort } from './application/ports/out/organismo-repository.port.js';
import { TypeOrmOrganismoRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-organismo.repository.js';
import { OrganismosController } from './infrastructure/http/organismos.controller.js';
import { CrearOrganismoUseCase } from './application/use-cases/crear-organismo.use-case.js';
import { AsignarAuditorUseCase } from './application/use-cases/asignar-auditor.use-case.js';
import { ListarAuditoresUseCase } from './application/use-cases/listar-auditores.use-case.js';
import { QuitarAuditorUseCase } from './application/use-cases/quitar-auditor.use-case.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { ListarOrganismosUseCase } from './application/use-cases/listar-organismos.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([OrganismoEntity]), UsuariosModule],
  controllers: [OrganismosController],
  providers: [
    CrearOrganismoUseCase,
    ListarOrganismosUseCase,
    AsignarAuditorUseCase,
    QuitarAuditorUseCase,
    ListarAuditoresUseCase,
    {
      provide: OrganismoRepositoryPort,
      useClass: TypeOrmOrganismoRepositoryAdapter,
    },
  ],
  exports: [OrganismoRepositoryPort],
})
export class OrganismosModule {}
