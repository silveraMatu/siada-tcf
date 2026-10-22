import { OrganismosModule } from '../organismos/organismos.module.js';
import { ResponsablesModule } from '../responsables/responsables.module.js';
import { CuentaMensualResolverPort } from './application/ports/out/cuenta-mensual-resolver.port.js';
import { TypeOrmCuentaMensualResolverAdapter } from './infrastructure/adapters/driven/persistence/typeorm-cuenta-mensual-resolver.adapter.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaAnualEntity } from './infrastructure/entities/cuenta-anual.entity.js';
import { CuentaMensualEntity } from './infrastructure/entities/cuenta-mensual.entity.js';
import { CuentaMensualRepositoryPort } from './application/ports/out/cuenta-mensual-repository.port.js';
import { TypeOrmCuentaMensualRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-cuenta-mensual.repository.js';
import { CuentasController } from './infrastructure/http/cuentas.controller.js';
import { ResolverCuentaMensualUseCase } from './application/use-cases/resolver-cuenta-mensual.use-case.js';
import { PresentarCuentaMensualUseCase } from './application/use-cases/presentar-cuenta-mensual.use-case.js';
import { ListarCuentasMensualesUseCase } from './application/use-cases/listar-cuentas-mensuales.use-case.js';
import { ResponsableDelOrganismoService } from './application/services/responsable-del-organismo.service.js';

@Module({
  imports: [
    OrganismosModule,
    ResponsablesModule,
    TypeOrmModule.forFeature([CuentaAnualEntity, CuentaMensualEntity]),
  ],
  controllers: [CuentasController],
  providers: [
    ResolverCuentaMensualUseCase,
    PresentarCuentaMensualUseCase,
    ListarCuentasMensualesUseCase,
    ResponsableDelOrganismoService,
    {
      provide: CuentaMensualResolverPort,
      useClass: TypeOrmCuentaMensualResolverAdapter,
    },
    {
      provide: CuentaMensualRepositoryPort,
      useClass: TypeOrmCuentaMensualRepositoryAdapter,
    },
  ],
  exports: [
    CuentaMensualRepositoryPort,
    ResolverCuentaMensualUseCase,
    ResponsableDelOrganismoService,
  ],
})
export class CuentasModule {}
