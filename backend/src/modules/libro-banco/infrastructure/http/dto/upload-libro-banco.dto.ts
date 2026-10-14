import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const TransaccionLibroBancoSchema = z.object({
  fecha: z.string().optional().describe('Fecha del movimiento (YYYY-MM-DD)'),
  cheque: z.string().optional().describe('Número de cheque o comprobante bancario'),
  aLaOrdenDe: z.string().min(1, 'El concepto / beneficiario es obligatorio'),
  depositos: z.number().nonnegative().default(0).describe('Monto ingresado / Depósitos'),
  retiro: z.number().nonnegative().default(0).describe('Monto egresado / Retiros'),
  saldo: z.number().describe('Saldo acumulado en la cuenta'),
});

export const UploadLibroBancoSchema = z.object({
  numeroCuentaCte: z.string().optional().describe('Número de Cta. Cte. extraído del libro'),
  transacciones: z.array(TransaccionLibroBancoSchema).min(1, 'Debe contener al menos una fila o transacción'),
});

export class UploadLibroBancoDto extends createZodDto(UploadLibroBancoSchema) {}