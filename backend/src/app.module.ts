import { Module } from '@nestjs/common';
import {ConfigModule, ConfigService} from "@nestjs/config"
import databaseConfig from './config/database.config.js';
import { TypeOrmModule } from '@nestjs/typeorm';

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

    //modulos de la aplicación
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
