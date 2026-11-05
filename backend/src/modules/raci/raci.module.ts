import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaciEntity } from './infrastructure/entities/raci.entity.js';
import { TransaccionRaciEntity } from './infrastructure/entities/transaccion-raci.entity.js';
import { RaciController } from './infrastructure/http/raci.controller.js';
import { IngestarRaciUseCase } from './application/use-cases/ingestar-raci.use-case.js';
import { ObtenerRaciUseCase } from './application/use-cases/obtener-raci.use-case.js';
import { RaciRepositoryPort } from './application/ports/out/raci-repository.port.js';
import { TypeOrmRaciRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-raci-repository.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaciEntity, TransaccionRaciEntity]),
    CuentasModule,
  ],
  controllers: [RaciController],
  providers: [
    IngestarRaciUseCase,
    ObtenerRaciUseCase,
    {
      provide: RaciRepositoryPort,
      useClass: TypeOrmRaciRepositoryAdapter,
    },
  ],
  exports: [IngestarRaciUseCase, ObtenerRaciUseCase, RaciRepositoryPort],
})
export class RaciModule {}
