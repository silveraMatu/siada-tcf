import { registerAs } from '@nestjs/config';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

//sin valor por defecto: si falta, la app no arranca (ver .env.example)
function requerir(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre} (ver .env.example).`,
    );
  }
  return valor;
}

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: requerir('POSTGRES_USER'),
  password: requerir('POSTGRES_PASS'),
  database: requerir('POSTGRES_DB'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  //DB_LOGGING=true registra las consultas con sus parametros (hashes, emails, DNI): solo para depurar
  logging: process.env.DB_LOGGING === 'true' ? true : ['warn', 'schema'],
  //sin migraciones: el esquema sigue a las entidades (DB_SYNCHRONIZE=false lo desactiva)
  synchronize: process.env.DB_SYNCHRONIZE !== 'false',
  //DB_DROP_SCHEMA=true borra todas las tablas al arrancar (se ignora en producción)
  dropSchema:
    process.env.NODE_ENV !== 'production' &&
    process.env.DB_DROP_SCHEMA === 'true',
}));
