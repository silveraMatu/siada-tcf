import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

//numeric(14,2) en bd admite hasta 10^12 en valor absoluto
const MAX_MONTO = 999_999_999_999.99;

//importe «del mes»: no negativo y 0 si la celda viene vacía
const importe = (descripcion: string) =>
  z.number().nonnegative().max(MAX_MONTO).default(0).describe(descripcion);

//los acumulados y saldos son resultado de la planilla y pueden ser negativos
const saldo = (descripcion: string) =>
  z.number().min(-MAX_MONTO).max(MAX_MONTO).describe(descripcion);

export const TransaccionRaciSchema = z.object({
  asiento: z
    .number()
    .int()
    .positive()
    .max(2147483647)
    .describe('N° de asiento (As.)'),
  fecha: z.iso.date('La fecha debe ser válida (YYYY-MM-DD)'),
  expediente: z.string().optional().describe('Expte. N°'),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  compromisoInstrumentoLegal: z
    .string()
    .optional()
    .describe('Compromiso: instrumento legal'),
  compromisoDelMes: importe('Compromiso: del mes'),
  compromisoAcumulado: saldo('Compromiso: acumulado'),
  compromisoOrdenProvision: z
    .string()
    .optional()
    .describe('Compromiso: orden de provisión'),
  devengadoDelMes: importe('Devengado: del mes'),
  devengadoAcumulado: saldo('Devengado: acumulado'),
  devengadoSaldo: saldo(
    'Devengado: saldo (compromiso acumulado − devengado acumulado)',
  ),
  devengadoOrdenPago: z
    .string()
    .optional()
    .describe('Devengado: orden de pago'),
  pagoNumeroCheque: z.string().optional().describe('Pago: N° de cheque'),
  pagoDelMes: importe('Pago: del mes'),
  pagoAcumulado: saldo('Pago: acumulado'),
  pagoSaldoAPagar: saldo(
    'Pago: saldo a pagar (devengado acumulado − pago acumulado)',
  ),
});

export const IngestarRaciSchema = z.object({
  reemplazar: z
    .boolean()
    .default(false)
    .describe(
      'Si la rendición ya tiene el libro: false lo rechaza (409), true lo reemplaza',
    ),
  transacciones: z
    .array(TransaccionRaciSchema)
    .min(1, 'Debe contener al menos un asiento'),
});

export class IngestarRaciDto extends createZodDto(IngestarRaciSchema) {}
