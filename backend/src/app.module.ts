import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import databaseConfig from './config/database.config.js';
import jwtConfig from './config/jwt.config.js';
import { configurarLogger } from './config/logger.config.js';
import { OrganismosModule } from './modules/organismos/organismos.module.js';
import { CuentasModule } from './modules/cuentas/cuentas.module.js';
import { LibroBancoModule } from './modules/libro-banco/libro-banco.module.js';
import { ResponsablesModule } from './modules/responsables/responsables.module.js';
import { UsuariosModule } from './modules/usuarios/usuarios.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { IngresosEgresosModule } from './modules/ingresos-egresos/ingresos-egresos.module.js';
import { RegistroActividadModule } from './modules/registro-actividad/registro-actividad.module.js';
import { AuditoriaModule } from './modules/auditoria/auditoria.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
    }),
    LoggerModule.forRoot(configurarLogger()),
    RegistroActividadModule,
    OrganismosModule,
    CuentasModule,
    LibroBancoModule,
    IngresosEgresosModule,
    ResponsablesModule,
    UsuariosModule,
    AuthModule,
    AuditoriaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
