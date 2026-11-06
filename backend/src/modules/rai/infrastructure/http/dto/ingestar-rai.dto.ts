import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

//numeric(14,2) en bd admite hasta 10^12 en valor absoluto
const MAX_MONTO = 999_999_999_999.99;

export const TransaccionRaiSchema = z.object({
  asiento: z
    .number()
    .int()
    .positive()
    .max(2147483647)
    .optional()
    .describe('Asto. N° (opcional: las planillas suelen traerlo vacío)'),
  fecha: z.iso.date('La fecha debe ser válida (YYYY-MM-DD)'),
  planillaNumero: z.string().optional().describe('Planilla N°'),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  //el ingreso del día: no negativo y 0 si la celda viene vacía
  ingresosDiarios: z
    .number()
    .nonnegative()
    .max(MAX_MONTO)
    .default(0)
    .describe('Ingresos diarios'),
  //los acumulados y el saldo son resultado de la planilla y pueden ser negativos
  ingresosMensuales: z
    .number()
    .min(-MAX_MONTO)
    .max(MAX_MONTO)
    .describe('Ingresos mensuales (acumulado del mes)'),
  ingresosAcumulados: z
    .number()
    .min(-MAX_MONTO)
    .max(MAX_MONTO)
    .describe('Ingresos acumulados del ejercicio'),
  saldo: z
    .number()
    .min(-MAX_MONTO)
    .max(MAX_MONTO)
    .describe('Saldo (total autorizado − ingresos acumulados)'),
});

export const IngestarRaiSchema = z.object({
  reemplazar: z
    .boolean()
    .default(false)
    .describe(
      'Si la rendición ya tiene el libro: false lo rechaza (409), true lo reemplaza',
    ),
  transacciones: z
    .array(TransaccionRaiSchema)
    .min(1, 'Debe contener al menos un asiento'),
});

export class IngestarRaiDto extends createZodDto(IngestarRaiSchema) {}
