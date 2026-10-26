import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ResumenPersonaSchema } from '../../../../../common/resumen-persona.js';

export const TransaccionLibroBancoResponseSchema = z.object({
  id: z.number().int(),
  fecha: z.string().nullable(),
  cheque: z.string().nullable(),
  aLaOrdenDe: z.string(),
  depositos: z.number(),
  retiro: z.number(),
  saldo: z.number(),
});

export const LibroBancoResponseSchema = z.object({
  id: z.number().int(),
  cuentaMensualId: z.number().int(),
  numeroCuentaCte: z.string().nullable(),
  fechaCreacion: z.iso.datetime(),
  subidoPorId: z.number().int(),
  subidoPor: ResumenPersonaSchema.nullable().describe(
    'Quién lo subió (nombre y apellido)',
  ),
  hashContenido: z.string().describe('sha256 del contenido cargado'),
  transacciones: z.array(TransaccionLibroBancoResponseSchema),
});

export class LibroBancoResponseDto extends createZodDto(
  LibroBancoResponseSchema,
) {}
