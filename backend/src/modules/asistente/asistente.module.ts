import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import asistenteConfig from '../../config/asistente.config.js';
import { CuentasModule } from '../cuentas/cuentas.module.js';
import { OrganismosModule } from '../organismos/organismos.module.js';
import { AsistenteIAPort } from './application/ports/out/asistente-ia.port.js';
import { ConsultarAsistenteUseCase } from './application/use-cases/consultar-asistente.use-case.js';
import { HttpAsistenteIAAdapter } from './infrastructure/adapters/driven/ia/http-asistente-ia.adapter.js';
import { AsistenteController } from './infrastructure/http/asistente.controller.js';

@Module({
  imports: [
    ConfigModule.forFeature(asistenteConfig),
    OrganismosModule,
    CuentasModule,
  ],
  controllers: [AsistenteController],
  providers: [
    ConsultarAsistenteUseCase,
    { provide: AsistenteIAPort, useClass: HttpAsistenteIAAdapter },
  ],
})
export class AsistenteModule {}
