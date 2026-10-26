import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClsModule } from 'nestjs-cls';
import { ContextoActividadPort } from './application/ports/out/contexto-actividad.port.js';
import { RegistroActividadRepositoryPort } from './application/ports/out/registro-actividad-repository.port.js';
import { ExportarActividadUseCase } from './application/use-cases/exportar-actividad.use-case.js';
import { ListarActividadUseCase } from './application/use-cases/listar-actividad.use-case.js';
import { RegistrarActividadUseCase } from './application/use-cases/registrar-actividad.use-case.js';
import { ClsContextoActividadAdapter } from './infrastructure/adapters/driven/contexto/cls-contexto-actividad.adapter.js';
import { RegistroActividadInicializador } from './infrastructure/adapters/driven/persistence/registro-actividad.inicializador.js';
import { TypeOrmRegistroActividadRepositoryAdapter } from './infrastructure/adapters/driven/persistence/typeorm-registro-actividad.repository.js';
import { RegistroActividadEntity } from './infrastructure/entities/registro-actividad.entity.js';
import { ActividadRegistrador } from './infrastructure/http/actividad-registrador.js';
import { ActividadController } from './infrastructure/http/actividad.controller.js';
import { ActividadFilter } from './infrastructure/http/actividad.filter.js';
import { ActividadGuard } from './infrastructure/http/actividad.guard.js';
import { ActividadInterceptor } from './infrastructure/http/actividad.interceptor.js';

//global: cualquier caso de uso puede aportar datos al evento de su petición sin importar este módulo
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([RegistroActividadEntity]),
    //contexto por petición (nestjs-cls): guarda lo que los casos de uso suman al evento
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true, generateId: true },
    }),
  ],
  controllers: [ActividadController],
  providers: [
    RegistrarActividadUseCase,
    ListarActividadUseCase,
    ExportarActividadUseCase,
    ActividadRegistrador,
    RegistroActividadInicializador,
    {
      provide: RegistroActividadRepositoryPort,
      useClass: TypeOrmRegistroActividadRepositoryAdapter,
    },
    { provide: ContextoActividadPort, useClass: ClsContextoActividadAdapter },
    { provide: APP_GUARD, useClass: ActividadGuard },
    { provide: APP_INTERCEPTOR, useClass: ActividadInterceptor },
    { provide: APP_FILTER, useClass: ActividadFilter },
  ],
  exports: [ContextoActividadPort],
})
export class RegistroActividadModule {}
