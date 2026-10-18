import { OrganismosModule } from '../organismos/organismos.module.js';
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

@Module({
  imports: [
    OrganismosModule,
    TypeOrmModule.forFeature([CuentaAnualEntity, CuentaMensualEntity]),
  ],
  controllers: [CuentasController],
  providers: [
    ResolverCuentaMensualUseCase,
    {
      provide: CuentaMensualResolverPort,
      useClass: TypeOrmCuentaMensualResolverAdapter,
    },
    {
      provide: CuentaMensualRepositoryPort,
      useClass: TypeOrmCuentaMensualRepositoryAdapter,
    },
  ],
  exports: [CuentaMensualRepositoryPort, ResolverCuentaMensualUseCase],
})
export class CuentasModule {}
