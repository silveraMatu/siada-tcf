import { Module } from '@nestjs/common';
import {ConfigModule, ConfigService} from "@nestjs/config"
import databaseConfig from './config/database.config.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganismoEntity } from './modules/organismos/infrastructure/entities/organismo.entity.js';
import { CuentaAnualEntity } from './modules/cuentas/infrastructure/entities/cuenta-anual.entity.js';
import { CuentaMensualEntity } from './modules/cuentas/infrastructure/entities/cuenta-mensual.entity.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),

    //typeorm
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => 
        configService.get("database")!
    }),

    //entidades
    TypeOrmModule.forFeature([
      OrganismoEntity,
      CuentaAnualEntity,
      CuentaMensualEntity
    ])
    //modulos de la aplicación
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
