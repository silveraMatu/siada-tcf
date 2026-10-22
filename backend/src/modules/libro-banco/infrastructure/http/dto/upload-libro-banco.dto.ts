import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

//numeric(14,2) en bd admite hasta 10^12 en valor absoluto
const MAX_MONTO = 999_999_999_999.99;

export const TransaccionLibroBancoSchema = z.object({
  fecha: z.string().optional().describe('Fecha del movimiento (YYYY-MM-DD)'),
  cheque: z
    .string()
    .optional()
    .describe('Número de cheque o comprobante bancario'),
  aLaOrdenDe: z.string().min(1, 'El concepto / beneficiario es obligatorio'),
  depositos: z
    .number()
    .nonnegative()
    .max(MAX_MONTO)
    .default(0)
    .describe('Monto ingresado / Depósitos'),
  retiro: z
    .number()
    .nonnegative()
    .max(MAX_MONTO)
    .default(0)
    .describe('Monto egresado / Retiros'),
  saldo: z
    .number()
    .min(-MAX_MONTO)
    .max(MAX_MONTO)
    .describe('Saldo acumulado en la cuenta'),
});

export const UploadLibroBancoSchema = z.object({
  numeroCuentaCte: z
    .string()
    .trim()
    .min(1, 'El N° de cuenta corriente es obligatorio')
    .max(255)
    .describe(
      'Número de Cta. Cte. del libro; solo puede haber un libro por número en cada rendición',
    ),
  reemplazar: z
    .boolean()
    .default(false)
    .describe(
      'Si ya hay un libro con ese N° de cuenta: false lo rechaza (409), true lo reemplaza',
    ),
  transacciones: z
    .array(TransaccionLibroBancoSchema)
    .min(1, 'Debe contener al menos una fila o transacción'),
});

export class UploadLibroBancoDto extends createZodDto(UploadLibroBancoSchema) {}
