import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ResumenPersonaSchema } from '../../../../../common/resumen-persona.js';

export const TransaccionRaiResponseSchema = z.object({
  id: z.number().int(),
  asiento: z.number().int().nullable(),
  fecha: z.string(),
  planillaNumero: z.string().nullable(),
  concepto: z.string(),
  ingresosDiarios: z.number(),
  ingresosMensuales: z.number(),
  ingresosAcumulados: z.number(),
  saldo: z.number(),
});

export const RaiResponseSchema = z.object({
  id: z.number().int(),
  cuentaMensualId: z.number().int(),
  fechaCreacion: z.iso.datetime(),
  subidoPorId: z.number().int(),
  subidoPor: ResumenPersonaSchema.nullable().describe(
    'Quién lo subió (nombre y apellido)',
  ),
  hashContenido: z.string().describe('sha256 del contenido cargado'),
  transacciones: z.array(TransaccionRaiResponseSchema),
});

export class RaiResponseDto extends createZodDto(RaiResponseSchema) {}
