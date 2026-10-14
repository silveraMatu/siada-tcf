import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CuentaAnualEntity } from './infrastructure/entities/cuenta-anual.entity.js';
import { CuentaMensualEntity } from './infrastructure/entities/cuenta-mensual.entity.js';
import { CuentaMensualRepositoryPort } from './application/ports/out/cuenta-mensual-repository.port.js';
import { TypeOrmCuentaMensualRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-cuenta-mensual.repository.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CuentaAnualEntity,
      CuentaMensualEntity,
    ]),
  ],
  providers: [
    {
      provide: CuentaMensualRepositoryPort,
      useClass: TypeOrmCuentaMensualRepositoryAdapter,
    },
  ],
  exports: [
    CuentaMensualRepositoryPort,
  ],
})
export class CuentasModule {}