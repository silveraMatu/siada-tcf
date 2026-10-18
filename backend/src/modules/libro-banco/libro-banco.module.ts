import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibroBancoEntity } from './infrastructure/entities/libro-banco.entity.js';
import { TransaccionLibroBancoEntity } from './infrastructure/entities/transaccion-libro-banco.entity.js';
import { LibroBancoController } from './infrastructure/http/libro-banco.controller.js';
import { IngestarLibroBancoUseCase } from './application/use-cases/ingestar-libro-banco.use-case.js';
import { LibroBancoRepositoryPort } from './application/ports/out/libro-banco-repository.port.js';
import { TypeOrmLibroBancoRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-libro-banco-repository.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';
import { ObtenerLibroBancoUseCase } from './application/use-cases/obtener-libro-banco.use-case.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([LibroBancoEntity, TransaccionLibroBancoEntity]),
    CuentasModule,
  ],
  controllers: [LibroBancoController],
  providers: [
    IngestarLibroBancoUseCase,
    ObtenerLibroBancoUseCase,
    {
      provide: LibroBancoRepositoryPort,
      useClass: TypeOrmLibroBancoRepositoryAdapter,
    },
  ],
  exports: [IngestarLibroBancoUseCase, ObtenerLibroBancoUseCase],
})
export class LibroBancoModule {}
