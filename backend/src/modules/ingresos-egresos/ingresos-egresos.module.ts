import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IngresosEgresosEntity } from './infrastructure/entities/ingresos-egresos.entity.js';
import { TransaccionIngresoEgresoEntity } from './infrastructure/entities/transaccion-ingreso-egreso.entity.js';
import { IngresosEgresosController } from './infrastructure/http/ingresos-egresos.controller.js';
import { IngestarIngresosEgresosUseCase } from './application/use-cases/ingestar-ingresos-egresos.use-case.js';
import { ObtenerIngresosEgresosUseCase } from './application/use-cases/obtener-ingresos-egresos.use-case.js';
import { IngresosEgresosRepositoryPort } from './application/ports/out/ingresos-egresos-repository.port.js';
import { TypeOrmIngresosEgresosRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-ingresos-egresos-repository.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IngresosEgresosEntity,
      TransaccionIngresoEgresoEntity,
    ]),
    CuentasModule,
  ],
  controllers: [IngresosEgresosController],
  providers: [
    IngestarIngresosEgresosUseCase,
    ObtenerIngresosEgresosUseCase,
    {
      provide: IngresosEgresosRepositoryPort,
      useClass: TypeOrmIngresosEgresosRepositoryAdapter,
    },
  ],
  exports: [IngestarIngresosEgresosUseCase, ObtenerIngresosEgresosUseCase],
})
export class IngresosEgresosModule {}
