import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
  transacciones: z.array(TransaccionLibroBancoResponseSchema),
});

export class LibroBancoResponseDto extends createZodDto(
  LibroBancoResponseSchema,
) {}
