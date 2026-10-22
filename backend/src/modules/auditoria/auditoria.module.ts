import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObservacionEntity } from './infrastructure/entities/observaciones.entity.js';
import { AuditoriaController } from './infrastructure/http/auditoria.controller.js';
import { AuditarLibroBancoUseCase } from './application/use-cases/auditar-libro-banco.use-case.js';
import { ListarObservacionesUseCase } from './application/use-cases/listar-observaciones.use-case.js';
import { ObservacionRepositoryPort } from './application/ports/out/observacion-repository.port.js';
import { TypeOrmObservacionRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-observacion-repository.adapter.js';
import { LibroBancoModule } from '../libro-banco/libro-banco.module.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ObservacionEntity]),
    LibroBancoModule,
    CuentasModule,
  ],
  controllers: [AuditoriaController],
  providers: [
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
