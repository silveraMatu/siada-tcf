//lo que se le pregunta al servicio de IA
export interface ConsultaIA {
  pregunta: string;
  //organismo al que queda limitada la consulta; null si el auditor no tiene ninguno (la IA responde que no puede ayudar)
  organismoId: number | null;
  //datos para el prompt del modelo: nunca DNI, email ni contraseñas
  metadatosOrganismo: Record<string, unknown> | null;
  contextoRendicion: Record<string, unknown> | null;
}

export type EstadoPasoIA =
  'en_curso' | 'completado' | 'sin_resultados' | 'error';

//una acción del modelo explicada en lenguaje natural: lo que ve el auditor para entender cómo se llegó a la respuesta.
//Nunca trae SQL, nombres de tablas o columnas, filas ni mensajes de error de la base
export interface PasoIA {
  //id de la llamada: une el paso «en curso» con su resultado
  id: string;
  //hoy solo 'consulta_datos'; queda como texto para sumar gráficos o tratamiento de datos
  accion: string;
  //lo que busca el modelo, en palabras
  descripcion: string;
  //de dónde salen los datos, en palabras de negocio (lo calcula el servicio de IA, no el modelo)
  fuentes: string[];
  estado: EstadoPasoIA;
  //resultado en palabras; null mientras el paso está en curso
  resultado: string | null;
  cantidadRegistros: number | null;
  //tiempo contra la base; null si no hubo consulta
  duracionMs: number | null;
  //había más registros que los que vio el modelo
  parcial: boolean;
}

export interface RespuestaIA {
  respuesta: string;
  //los pasos terminados, en orden; vacío si el modelo no consultó nada
  pasos: PasoIA[];
}

//lo que va ocurriendo mientras el agente trabaja; el cierre normal es el fin del iterable
export type EventoIA =
  | { tipo: 'pensando'; mensaje: string }
  | { tipo: 'paso'; paso: PasoIA }
  | { tipo: 'respuesta'; respuesta: string };

export abstract class AsistenteIAPort {
  //lanza AsistenteNoConfiguradoError o AsistenteNoDisponibleError
  abstract consultar(consulta: ConsultaIA): Promise<RespuestaIA>;

  //abre la consulta en vivo: espera a que el servicio acepte el pedido (así un servicio caído o sin configurar falla
  //acá, antes de empezar a emitir) y devuelve los eventos a medida que ocurren. Un fallo durante el flujo lanza
  //AsistenteNoDisponibleError desde el iterable. `cancelacion` corta la llamada al servicio.
  abstract iniciarConsultaEnVivo(
    consulta: ConsultaIA,
    cancelacion?: AbortSignal,
  ): Promise<AsyncIterable<EventoIA>>;
}
