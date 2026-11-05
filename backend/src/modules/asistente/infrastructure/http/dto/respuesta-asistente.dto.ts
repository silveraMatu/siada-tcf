import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const PasoAsistenteSchema = z.object({
  accion: z
    .string()
    .describe('Tipo de acción del modelo; hoy solo "consulta_sql"'),
  querySql: z
    .string()
    .describe(
      'SQL ejecutado (con su LIMIT); si las guardas lo rechazaron, lo que escribió el modelo',
    ),
  cantidadFilas: z
    .number()
    .int()
    .nullable()
    .describe('Filas que vio el modelo; 0 si hubo error'),
  duracionMs: z
    .number()
    .int()
    .nullable()
    .describe('Tiempo contra la base; null si no hubo consulta'),
  error: z
    .string()
    .nullable()
    .describe('Motivo si la consulta fue rechazada o falló'),
  truncado: z
    .boolean()
    .describe('Había más filas que las que vio el modelo (tope de 50)'),
  columnas: z.array(z.string()).describe('Columnas del resultado'),
  filas: z
    .array(z.array(z.unknown()))
    .describe(
      'Las mismas filas que vio el modelo; importes y fechas como texto. Es contenido cargado por responsables: escapar al mostrarlo',
    ),
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
      'Qué hizo el modelo contra la base para responder, en orden (incluye los intentos fallidos); vacío si no consultó nada',
    ),
});

export class RespuestaAsistenteDto extends createZodDto(
  RespuestaAsistenteSchema,
) {}
