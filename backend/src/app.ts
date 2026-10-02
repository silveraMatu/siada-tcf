import Fastify from "fastify";
import dbPlugin from "./core/plugins/db.plugin.js";
import {serializerCompiler, validatorCompiler, ZodTypeProvider} from "fastify-type-provider-zod"

export function buildApp(){
  const app = Fastify({
    logger: true
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(dbPlugin) //registro del plugin de la db

  app.get('/health', async(request, reply)=>{
    return {status: 'ok', timestamp: new Date().toISOString()}
  })

  return app
}

