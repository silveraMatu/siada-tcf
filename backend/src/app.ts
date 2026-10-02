import Fastify from "fastify";
import dbPlugin from "./core/plugins/db.plugin.js";

export function buildApp(){
  const app = Fastify({
    logger: true
  });

  app.register(dbPlugin) //registro del plugin de la db

  app.get('/health', async(request, reply)=>{
    return {status: 'ok', timestamp: new Date().toISOString()}
  })

  return app
}

