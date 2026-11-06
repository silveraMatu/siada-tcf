import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RaiEntity } from './infrastructure/entities/rai.entity.js';
import { TransaccionRaiEntity } from './infrastructure/entities/transaccion-rai.entity.js';
import { RaiController } from './infrastructure/http/rai.controller.js';
import { IngestarRaiUseCase } from './application/use-cases/ingestar-rai.use-case.js';
import { ObtenerRaiUseCase } from './application/use-cases/obtener-rai.use-case.js';
import { RaiRepositoryPort } from './application/ports/out/rai-repository.port.js';
import { TypeOrmRaiRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-rai-repository.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RaiEntity, TransaccionRaiEntity]),
    CuentasModule,
  ],
  controllers: [RaiController],
  providers: [
    IngestarRaiUseCase,
    ObtenerRaiUseCase,
    {
      provide: RaiRepositoryPort,
      useClass: TypeOrmRaiRepositoryAdapter,
    },
  ],
  exports: [IngestarRaiUseCase, ObtenerRaiUseCase, RaiRepositoryPort],
})
export class RaiModule {}
