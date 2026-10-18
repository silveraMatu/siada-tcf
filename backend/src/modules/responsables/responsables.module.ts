import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganismosModule } from '../organismos/organismos.module.js';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { ResponsableEntity } from './infrastructure/entities/responsable.entity.js';
import { ResponsableRepositoryPort } from './application/ports/out/responsable-repository.port.js';
import { TypeOrmResponsableRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-responsable.repository.js';
import { ResponsablesController } from './infrastructure/http/responsables.controller.js';
import { CrearResponsableUseCase } from './application/use-cases/crear-responsable.use-case.js';
import { AsignarOrganismoAResponsableUseCase } from './application/use-cases/asignar-organismo.use-case.js';
import { ListarResponsablesUseCase } from './application/use-cases/listar-responsables.use-case.js';
import { ObtenerResponsablesPorOrganismoUseCase } from './application/use-cases/obtener-responsables-por-organismo.use-case.js';

@Module({
  imports: [
    OrganismosModule,
    UsuariosModule,
    TypeOrmModule.forFeature([ResponsableEntity]),
  ],
  controllers: [ResponsablesController],
  providers: [
    CrearResponsableUseCase,
    ListarResponsablesUseCase,
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
