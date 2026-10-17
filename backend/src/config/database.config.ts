import { registerAs } from '@nestjs/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASS || 'password',
  database: process.env.POSTGRES_DB || 'siada_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // dropSchema: true,
  synchronize: true,
  logging: true,
}));