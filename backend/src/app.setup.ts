import type { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { ZodValidationPipe } from 'nestjs-zod';

export const PREFIJO_API = 'api/v1';

//el front envía el csv ya parseado como json: solo la ingesta necesita un límite alto
const RUTA_INGESTA =
  /^\/api\/v1\/cuentas-mensuales\/[^/]+\/(?:libro-banco|ingresos-egresos)\/ingestar\/?$/;
const LIMITE_INGESTA = '10mb';
const LIMITE_GENERAL = '100kb';

//configuración común de main.ts y los e2e; la app debe crearse con { bodyParser: false }
export function configurarApp(app: NestExpressApplication): void {
  app.setGlobalPrefix(PREFIJO_API);

  //el primer parser que lee el body lo marca como leído y el siguiente lo omite
  app.use(RUTA_INGESTA, express.json({ limit: LIMITE_INGESTA }));
  app.use(express.json({ limit: LIMITE_GENERAL }));

  //pipe global de validación Zod
  app.useGlobalPipes(new ZodValidationPipe());
}
