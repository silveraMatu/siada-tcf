import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { configurarApp } from '../../src/app.setup.js';
import databaseConfig from '../../src/config/database.config.js';
import jwtConfig from '../../src/config/jwt.config.js';
import { OrganismosModule } from '../../src/modules/organismos/organismos.module.js';
import { CuentasModule } from '../../src/modules/cuentas/cuentas.module.js';
import { LibroBancoModule } from '../../src/modules/libro-banco/libro-banco.module.js';
import { ResponsablesModule } from '../../src/modules/responsables/responsables.module.js';
import { UsuariosModule } from '../../src/modules/usuarios/usuarios.module.js';
import { AuthModule } from '../../src/modules/auth/auth.module.js';
import { AuditoriaModule } from '../../src/modules/auditoria/auditoria.module.js';

//replica AppModule/main.ts: misma config y setup; solo cambian las entidades (autoLoadEntities en vez del glob, que Node no parsea fuera del build)
export async function createTestApp(): Promise<{
  app: INestApplication;
  dataSource: DataSource;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [databaseConfig, jwtConfig],
      }),
      TypeOrmModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
          ...configService.get('database')!,
          entities: undefined,
          autoLoadEntities: true,
        }),
      }),
      OrganismosModule,
      CuentasModule,
      LibroBancoModule,
      ResponsablesModule,
      UsuariosModule,
      AuthModule,
      AuditoriaModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  configurarApp(app);
  //escucha una sola vez en un puerto libre local: si no, supertest abre y cierra el servidor en cada request y puede fallar al encadenarlos
  await app.listen(0, '127.0.0.1');

  return { app, dataSource: app.get(DataSource) };
}
