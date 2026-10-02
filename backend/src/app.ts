import Fastify from "fastify";
import dbPlugin from "./core/plugins/db.plugin.js";
import {serializerCompiler, validatorCompiler, ZodTypeProvider} from "fastify-type-provider-zod"
import errorHandlerPlugin from "./core/plugins/error-handler.plugin.js";

export function buildApp(){
  const app = Fastify({
    logger: true
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(dbPlugin) //plugin de la db
  app.register(errorHandlerPlugin) //plugin de manejo de errores

  app.get('/health', async(request, reply)=>{
    return {status: 'ok', timestamp: new Date().toISOString()}
  })

  return app
}

