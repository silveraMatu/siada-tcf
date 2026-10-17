import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganismosModule } from '../organismos/organismo.module.js';
import { ResponsableEntity } from './infrastructure/entities/responsable.entity.js';
import { ResponsableRepositoryPort } from './application/ports/out/responsable-repository.port.js';
import { TypeOrmResponsableRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-responsable.repository.js';
import { ResponsablesController } from './infrastructure/http/responsables.controller.js';
import { CrearResponsableUseCase } from './application/use-cases/crear-responsable.use-case.js';
import { AsignarOrganismoAResponsableUseCase } from './application/use-cases/asignar-organismo.use-case.js';
import { ObtenerResponsablesPorOrganismoUseCase } from './application/use-cases/obtener-responsables-por-organismo.use-case.js';

@Module({
  imports: [OrganismosModule, TypeOrmModule.forFeature([ResponsableEntity])],
  controllers: [ResponsablesController],
  providers: [
    CrearResponsableUseCase,
    ObtenerResponsablesPorOrganismoUseCase,
    AsignarOrganismoAResponsableUseCase,
    {
      provide: ResponsableRepositoryPort,
      useClass: TypeOrmResponsableRepositoryAdapter,
    },
  ],
  exports: [AsignarOrganismoAResponsableUseCase],
})
export class ResponsablesModule {}
