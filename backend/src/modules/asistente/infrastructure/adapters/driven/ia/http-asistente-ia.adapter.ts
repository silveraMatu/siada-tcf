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
  type EventoIA,
  type PasoIA,
  type RespuestaIA,
} from '../../../../application/ports/out/asistente-ia.port.js';

const RUTA_CHAT = '/api/v1/agent/chat';
const RUTA_CHAT_EN_VIVO = '/api/v1/agent/chat/stream';

//el servicio manda snake_case; los campos opcionales caen a un valor neutro para tolerar un servicio más viejo
const PasoServicioSchema = z.object({
  id: z.string(),
  accion: z.string(),
  descripcion: z.string(),
  fuentes: z.array(z.string()).default([]),
  estado: z.enum(['en_curso', 'completado', 'sin_resultados', 'error']),
  resultado: z.string().nullish(),
  cantidad_registros: z.number().int().nullish(),
  duracion_ms: z.number().int().nullish(),
  parcial: z.boolean().default(false),
});

const RespuestaServicioSchema = z.object({
  respuesta: z.string(),
  pasos: z.array(PasoServicioSchema).default([]),
});

//datos de cada tipo de evento del flujo en vivo
const PensandoSchema = z.object({ mensaje: z.string() });
const RespuestaEnVivoSchema = z.object({ respuesta: z.string() });

const aPasoIA = (p: z.infer<typeof PasoServicioSchema>): PasoIA => ({
  id: p.id,
  accion: p.accion,
  descripcion: p.descripcion,
  fuentes: p.fuentes,
  estado: p.estado,
  resultado: p.resultado ?? null,
  cantidadRegistros: p.cantidad_registros ?? null,
  duracionMs: p.duracion_ms ?? null,
  parcial: p.parcial,
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
    const respuesta = await this.abrir(RUTA_CHAT, consulta);

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
      pasos: valido.data.pasos.map(aPasoIA),
    };
  }

  async iniciarConsultaEnVivo(
    consulta: ConsultaIA,
    cancelacion?: AbortSignal,
  ): Promise<AsyncIterable<EventoIA>> {
    //acá se espera la cabecera: si el servicio está caído o rechaza el pedido falla antes de emitir nada
    const respuesta = await this.abrir(
      RUTA_CHAT_EN_VIVO,
      consulta,
      cancelacion,
    );
    if (!respuesta.body) {
      this.logger.error('El servicio de IA no devolvió un flujo');
      throw new AsistenteNoDisponibleError();
    }
    return this.leerEventos(respuesta.body);
  }

  //hace el pedido y devuelve la respuesta ya comprobada (2xx). En los logs solo va el tipo de error o el status:
  //nunca la clave, la pregunta ni lo que contesta el servicio. El tiempo máximo cubre también la lectura del cuerpo
  private async abrir(
    ruta: string,
    consulta: ConsultaIA,
    cancelacion?: AbortSignal,
  ): Promise<Response> {
    const { url, apiKey, timeoutMs } = this.config;
    if (!url || !apiKey) throw new AsistenteNoConfiguradoError();

    const limite = AbortSignal.timeout(timeoutMs);
    let respuesta: Response;
    try {
      respuesta = await fetch(`${url}${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
        body: JSON.stringify({
          pregunta: consulta.pregunta,
          organismo_id: consulta.organismoId,
          metadatos_organismo: consulta.metadatosOrganismo,
          contexto_rendicion: consulta.contextoRendicion,
        }),
        signal: cancelacion ? AbortSignal.any([limite, cancelacion]) : limite,
      });
    } catch (error) {
      this.logger.error(
        `No se pudo llamar al servicio de IA (${error instanceof Error ? error.name : 'error desconocido'})`,
      );
      throw new AsistenteNoDisponibleError();
    }

    if (!respuesta.ok) {
      this.logger.error(`El servicio de IA respondió ${respuesta.status}`);
      await respuesta.body?.cancel().catch(() => undefined);
      throw new AsistenteNoDisponibleError();
    }
    return respuesta;
  }

  //lee Server-Sent Events: bloques separados por una línea en blanco, con `event:` y `data:`; las líneas que
  //empiezan con `:` son comentarios (keepalive). El flujo termina con el evento `fin`; si se corta sin él, falla
  private async *leerEventos(
    cuerpo: ReadableStream<Uint8Array>,
  ): AsyncGenerator<EventoIA> {
    const lector = cuerpo.getReader();
    const decodificador = new TextDecoder();
    let pendiente = '';
    try {
      for (;;) {
        const { value, done } = await lector.read();
        if (done) break;
        //se normaliza sobre lo acumulado: un \r\n puede llegar partido entre dos trozos
        pendiente = (
          pendiente + decodificador.decode(value, { stream: true })
        ).replace(/\r\n/g, '\n');
        for (
          let corte = pendiente.indexOf('\n\n');
          corte !== -1;
          corte = pendiente.indexOf('\n\n')
        ) {
          const bloque = pendiente.slice(0, corte);
          pendiente = pendiente.slice(corte + 2);
          const evento = this.interpretar(bloque);
          if (evento === 'fin') return;
          if (evento) yield evento;
        }
      }
      this.logger.error('El flujo del servicio de IA se cortó sin terminar');
      throw new AsistenteNoDisponibleError();
    } catch (error) {
      if (error instanceof AsistenteNoDisponibleError) throw error;
      //cancelación, tiempo agotado o corte de red a mitad del flujo
      this.logger.error(
        `Se interrumpió el flujo del servicio de IA (${error instanceof Error ? error.name : 'error desconocido'})`,
      );
      throw new AsistenteNoDisponibleError();
    } finally {
      await lector.cancel().catch(() => undefined);
    }
  }

  //un bloque SSE → un evento, 'fin', o null si es un comentario o un evento que este cliente no conoce
  private interpretar(bloque: string): EventoIA | 'fin' | null {
    let nombre: string | null = null;
    const datos: string[] = [];
    for (const linea of bloque.split('\n')) {
      if (linea.startsWith(':')) continue;
      if (linea.startsWith('event:')) nombre = linea.slice(6).trim();
      else if (linea.startsWith('data:'))
        datos.push(linea.slice(5).trimStart());
    }
    if (nombre === null) return null;
    if (nombre === 'fin') return 'fin';

    let contenido: unknown;
    try {
      contenido = JSON.parse(datos.join('\n'));
    } catch {
      this.logger.error(
        `Evento "${nombre}" del servicio de IA sin JSON válido`,
      );
      throw new AsistenteNoDisponibleError();
    }

    if (nombre === 'error') {
      this.logger.error('El servicio de IA informó un error durante el flujo');
      throw new AsistenteNoDisponibleError();
    }
    const invalido = () => {
      this.logger.error(
        `Evento "${nombre}" del servicio de IA con forma inesperada`,
      );
      return new AsistenteNoDisponibleError();
    };
    if (nombre === 'pensando') {
      const v = PensandoSchema.safeParse(contenido);
      if (!v.success) throw invalido();
      return { tipo: 'pensando', mensaje: v.data.mensaje };
    }
    if (nombre === 'paso') {
      const v = PasoServicioSchema.safeParse(contenido);
      if (!v.success) throw invalido();
      return { tipo: 'paso', paso: aPasoIA(v.data) };
    }
    if (nombre === 'respuesta') {
      const v = RespuestaEnVivoSchema.safeParse(contenido);
      if (!v.success) throw invalido();
      return { tipo: 'respuesta', respuesta: v.data.respuesta };
    }
    return null; //un evento nuevo del servicio: se ignora en vez de romper
  }
}
