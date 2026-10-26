import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservacionEntity } from './infrastructure/entities/observaciones.entity.js';
import { AuditoriaController } from './infrastructure/http/auditoria.controller.js';
import { EjecutarAuditoriaUseCase } from './application/use-cases/ejecutar-auditoria.use-case.js';
import { CerrarAuditoriaUseCase } from './application/use-cases/cerrar-auditoria.use-case.js';
import { RevisarObservacionUseCase } from './application/use-cases/revisar-observacion.use-case.js';
import { ObservacionesController } from './infrastructure/http/observaciones.controller.js';
import { ObtenerEjecucionUseCase } from './application/use-cases/obtener-ejecucion.use-case.js';
import { ListarObservacionesUseCase } from './application/use-cases/listar-observaciones.use-case.js';
import { ObservacionRepositoryPort } from './application/ports/out/observacion-repository.port.js';
import { DocumentosAuditablesPort } from './application/ports/out/documentos-auditables.port.js';
import { EjecucionAuditoriaRepositoryPort } from './application/ports/out/ejecucion-auditoria-repository.port.js';
import { EjecucionAuditoriaEntity } from './infrastructure/entities/ejecucion-auditoria.entity.js';
import { RepositoriosDocumentosAuditablesAdapter } from './infrastructure/adapters/driven/documentos/repositorios-documentos-auditables.adapter.js';
import { TypeOrmEjecucionAuditoriaRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-ejecucion-auditoria-repository.adapter.js';
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
    TypeOrmModule.forFeature([ObservacionEntity, EjecucionAuditoriaEntity]),
    LibroBancoModule,
    IngresosEgresosModule,
    CuentasModule,
  ],
  controllers: [AuditoriaController, ObservacionesController],
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
    EjecutarAuditoriaUseCase,
    ObtenerEjecucionUseCase,
    RevisarObservacionUseCase,
    CerrarAuditoriaUseCase,
    ListarObservacionesUseCase,
    {
      provide: EjecucionAuditoriaRepositoryPort,
      useClass: TypeOrmEjecucionAuditoriaRepositoryAdapter,
    },
    {
      provide: DocumentosAuditablesPort,
      useClass: RepositoriosDocumentosAuditablesAdapter,
    },
    {
      provide: ObservacionRepositoryPort,
      useClass: TypeOrmObservacionRepositoryAdapter,
    },
  ],
})
export class AuditoriaModule {}
