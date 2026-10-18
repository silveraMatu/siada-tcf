import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config.js';
import { OrganismosModule } from './modules/organismos/organismos.module.js';
import { CuentasModule } from './modules/cuentas/cuentas.module.js';
import { LibroBancoModule } from './modules/libro-banco/libro-banco.module.js';
import { ResponsablesModule } from './modules/responsables/responsables.module.js';
import { UsuariosModule } from './modules/usuarios/usuarios.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!,
    }),
    OrganismosModule,
    CuentasModule,
    LibroBancoModule,
    ResponsablesModule,
    UsuariosModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
