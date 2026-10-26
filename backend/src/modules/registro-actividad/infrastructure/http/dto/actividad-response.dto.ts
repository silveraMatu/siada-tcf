import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AccionActividad } from '../../../domain/enums/accion-actividad.enum.js';
import { ResultadoActividad } from '../../../domain/enums/resultado-actividad.enum.js';

export const EventoActividadResponseSchema = z.object({
  id: z.number().int(),
  ocurridoEn: z.iso.datetime(),
  accion: z.enum(AccionActividad),
  resultado: z.enum(ResultadoActividad),
  codigoHttp: z.number().int(),
  usuarioId: z.number().int().nullable(),
  nombre: z.string().nullable(),
  apellido: z.string().nullable(),
  dni: z.string().nullable(),
  roles: z.array(z.string()),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  requestId: z.string().nullable(),
  entidadTipo: z.string().nullable(),
  entidadId: z.number().int().nullable(),
  organismoId: z.number().int().nullable(),
  cuentaMensualId: z.number().int().nullable(),
  detalle: z.record(z.string(), z.unknown()).nullable(),
});

export const PaginaActividadResponseSchema = z.object({
  eventos: z.array(EventoActividadResponseSchema),
  siguienteCursor: z
    .number()
    .int()
    .nullable()
    .describe(
      'Pasar como cursor para pedir la página siguiente; null si no hay más',
    ),
});

export class PaginaActividadResponseDto extends createZodDto(
  PaginaActividadResponseSchema,
) {}
