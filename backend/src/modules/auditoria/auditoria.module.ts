import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservacionEntity } from './infrastructure/entities/observaciones.entity.js';
import { AuditoriaController } from './infrastructure/http/auditoria.controller.js';
import { AuditarLibroBancoUseCase } from './application/use-cases/auditar-libro-banco.use-case.js';
import { ListarObservacionesUseCase } from './application/use-cases/listar-observaciones.use-case.js';
import { ObservacionRepositoryPort } from './application/ports/out/observacion-repository.port.js';
import { TypeOrmObservacionRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-observacion-repository.adapter.js';
import { MotorAuditoriaService } from './domain/engine/motor-auditoria.service.js';
import { CruceDepositosC4Rule } from './domain/rules/cruce-ingresos-egresos-banco-depositos.rule.js';
import { CruceRetirosC5Rule } from './domain/rules/cruce-ingresos-egresos-banco-retiros.rule.js';
import { CruceSaldoFinalC6Rule } from './domain/rules/cruce-ingresos-egresos-banco-saldofinal.rule.js';
import { IngresosEgresosV2Rule } from './domain/rules/ingresos-egresos-banco.rule.js';
import { IngresosEgresosV1Rule } from './domain/rules/ingresos-egresos-caja.rule.js';
import { LibroBancoV3Rule } from './domain/rules/libro-banco-saldo.rule.js';
import { IngresosEgresosModule } from '../ingresos-egresos/ingresos-egresos.module.js';
import { LibroBancoModule } from '../libro-banco/libro-banco.module.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ObservacionEntity]),
    LibroBancoModule,
    IngresosEgresosModule,
    CuentasModule,
  ],
  controllers: [AuditoriaController],
  providers: [
    //el motor es dominio puro (sin decoradores): se arma acá con las reglas disponibles
    {
      provide: MotorAuditoriaService,
      //el orden de las reglas es el de la respuesta
      useFactory: () =>
        new MotorAuditoriaService([
          new IngresosEgresosV1Rule(),
          new IngresosEgresosV2Rule(),
          new LibroBancoV3Rule(),
          new CruceDepositosC4Rule(),
          new CruceRetirosC5Rule(),
          new CruceSaldoFinalC6Rule(),
        ]),
    },
    AuditarLibroBancoUseCase,
    ListarObservacionesUseCase,
    {
      provide: ObservacionRepositoryPort,
      useClass: TypeOrmObservacionRepositoryAdapter,
    },
  ],
  exports: [AuditarLibroBancoUseCase],
})
export class AuditoriaModule {}
