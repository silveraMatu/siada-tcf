import fp from "fastify-plugin";
import { FastifyPluginAsync } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../database/index.js";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify) => {
  try {
   await db.execute(sql`SELECT 1`);
   fastify.log.info("Conexión con PostgreSQL establecida correctamente")
  } catch (err) {
    fastify.log.error(err, 'Error al conectar con la base de datos')
    throw err
  }

  fastify.decorate('db', db)
};

export default fp(dbPlugin, {name: 'db'})