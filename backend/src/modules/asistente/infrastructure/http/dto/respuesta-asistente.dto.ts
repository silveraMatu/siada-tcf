import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PasoAsistenteSchema = z.object({
  id: z
    .string()
    .describe(
      'Identifica el paso: el evento «en_curso» y su resultado comparten id',
    ),
  accion: z
    .string()
    .describe('Tipo de acción del agente; hoy "consulta_datos"'),
  descripcion: z
    .string()
    .describe('Lo que busca el agente, en lenguaje natural (texto plano)'),
  fuentes: z
    .array(z.string())
    .describe(
      'De dónde salen los datos, en palabras de negocio (por ejemplo «libro banco»)',
    ),
  estado: z
    .enum(['en_curso', 'completado', 'sin_resultados', 'error'])
    .describe('Cómo va el paso'),
  resultado: z
    .string()
    .nullable()
    .describe(
      'Resultado en palabras («Encontré 3 registros»); null mientras está en curso',
    ),
  cantidadRegistros: z
    .number()
    .int()
    .nullable()
    .describe(
      'Registros que vio el agente; null si el paso falló o sigue en curso',
    ),
  duracionMs: z
    .number()
    .int()
    .nullable()
    .describe('Tiempo que tardó la consulta de datos'),
  parcial: z
    .boolean()
    .describe('Había más registros que los que analizó el agente'),
});

export const RespuestaAsistenteSchema = z.object({
  respuesta: z.string().describe('Respuesta del copiloto'),
  organismoId: z
    .number()
    .int()
    .nullable()
    .describe(
      'Organismo sobre el que se consultó; null si el auditor no tiene ninguno asignado',
    ),
  pasos: z
    .array(PasoAsistenteSchema)
    .describe(
      'Razonamiento del agente en lenguaje natural, en orden (incluye los intentos que fallaron); vacío si no consultó nada. Nunca trae SQL ni datos',
    ),
});

export class RespuestaAsistenteDto extends createZodDto(
  RespuestaAsistenteSchema,
) {}
