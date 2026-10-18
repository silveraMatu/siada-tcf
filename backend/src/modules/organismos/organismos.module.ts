import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganismoEntity } from './infrastructure/entities/organismo.entity.js';
import { OrganismoRepositoryPort } from './application/ports/out/organismo-repository.port.js';
import { TypeOrmOrganismoRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-organismo.repository.js';
import { OrganismosController } from './infrastructure/http/organismos.controller.js';
import { CrearOrganismoUseCase } from './application/use-cases/crear-organismo.use-case.js';
import { ListarOrganismosUseCase } from './application/use-cases/listar-organismos.use-case.js';

@Module({
  imports: [TypeOrmModule.forFeature([OrganismoEntity])],
  controllers: [OrganismosController],
  providers: [
    CrearOrganismoUseCase,
    ListarOrganismosUseCase,
    {
      provide: OrganismoRepositoryPort,
      useClass: TypeOrmOrganismoRepositoryAdapter,
    },
  ],
  exports: [OrganismoRepositoryPort],
})
export class OrganismosModule {}
