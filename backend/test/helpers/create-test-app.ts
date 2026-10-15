import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZodValidationPipe } from 'nestjs-zod';
import { DataSource } from 'typeorm';
import { OrganismosModule } from '../../src/modules/organismos/organismo.module.js';
import { CuentasModule } from '../../src/modules/cuentas/cuentas.module.js';
import { LibroBancoModule } from '../../src/modules/libro-banco/libro-banco.module.js';

//Replica AppModule/main.ts contra la base real. No usa AppModule porque su config carga las
//entidades por glob (*.entity.ts) con import nativo, que Node no puede parsear fuera de la compilacion.
export async function createTestApp(): Promise<{ app: INestApplication; dataSource: DataSource }> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
        username: process.env.POSTGRES_USER || 'admin',
        password: process.env.POSTGRES_PASS || 'password',
        database: process.env.POSTGRES_DB || 'siada_db',
        autoLoadEntities: true,
        synchronize: true,
      }),
      OrganismosModule,
      CuentasModule,
      LibroBancoModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();

  return { app, dataSource: app.get(DataSource) };
}
