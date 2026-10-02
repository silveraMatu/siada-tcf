// src/core/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}

export const db = drizzle(connectionString);

