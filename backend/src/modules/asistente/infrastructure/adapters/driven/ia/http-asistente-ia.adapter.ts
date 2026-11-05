import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { z } from 'zod';
import asistenteConfig from '../../../../../../config/asistente.config.js';
import {
  AsistenteNoConfiguradoError,
  AsistenteNoDisponibleError,
} from '../../../../domain/errors/asistente.errors.js';
import {
  AsistenteIAPort,
  type ConsultaIA,
  type RespuestaIA,
} from '../../../../application/ports/out/asistente-ia.port.js';

const RUTA_CHAT = '/api/v1/agent/chat';

//el servicio manda snake_case; cada campo opcional cae a un valor neutro para tolerar un servicio más viejo
const PasoServicioSchema = z.object({
  accion: z.string(),
  query_sql: z.string(),
  cantidad_filas: z.number().int().nullish(),
  duracion_ms: z.number().int().nullish(),
  error: z.string().nullish(),
  truncado: z.boolean().default(false),
  columnas: z.array(z.string()).default([]),
  filas: z.array(z.array(z.unknown())).default([]),
});

const RespuestaServicioSchema = z.object({
  respuesta: z.string(),
  pasos: z.array(PasoServicioSchema).default([]),
});

//llama al servicio ia-agent-service (FastAPI) con su API key; el navegador nunca habla con él
@Injectable()
export class HttpAsistenteIAAdapter extends AsistenteIAPort {
  private readonly logger = new Logger(HttpAsistenteIAAdapter.name);

  constructor(
    @Inject(asistenteConfig.KEY)
    private readonly config: ConfigType<typeof asistenteConfig>,
  ) {
    super();
  }

  async consultar(consulta: ConsultaIA): Promise<RespuestaIA> {
    const { url, apiKey, timeoutMs } = this.config;
    if (!url || !apiKey) throw new AsistenteNoConfiguradoError();

    //en los logs solo va el tipo de error o el status: nunca la clave, la pregunta ni lo que contesta el servicio
    let respuesta: Response;
    try {
      respuesta = await fetch(`${url}${RUTA_CHAT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          pregunta: consulta.pregunta,
          organismo_id: consulta.organismoId,
          metadatos_organismo: consulta.metadatosOrganismo,
          contexto_rendicion: consulta.contextoRendicion,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.logger.error(
        `No se pudo llamar al servicio de IA (${error instanceof Error ? error.name : 'error desconocido'})`,
      );
      throw new AsistenteNoDisponibleError();
    }

    if (!respuesta.ok) {
      this.logger.error(`El servicio de IA respondió ${respuesta.status}`);
      throw new AsistenteNoDisponibleError();
    }

    let cuerpo: unknown;
    try {
      cuerpo = await respuesta.json();
    } catch {
      this.logger.error('El servicio de IA devolvió un cuerpo que no es JSON');
      throw new AsistenteNoDisponibleError();
    }
    const valido = RespuestaServicioSchema.safeParse(cuerpo);
    if (!valido.success) {
      this.logger.error('El servicio de IA devolvió una respuesta inesperada');
      throw new AsistenteNoDisponibleError();
    }
    return {
      respuesta: valido.data.respuesta,
      pasos: valido.data.pasos.map((p) => ({
        accion: p.accion,
        querySql: p.query_sql,
        cantidadFilas: p.cantidad_filas ?? null,
        duracionMs: p.duracion_ms ?? null,
        error: p.error ?? null,
        truncado: p.truncado,
        columnas: p.columnas,
        filas: p.filas,
      })),
    };
  }
}
