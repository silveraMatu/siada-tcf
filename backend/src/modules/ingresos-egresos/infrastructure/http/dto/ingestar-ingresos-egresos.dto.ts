import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

//numeric(14,2) en bd admite hasta 10^12 en valor absoluto
const MAX_MONTO = 999_999_999_999.99;

//importe de debe, haber, egreso o ingreso: no negativo y 0 si la celda viene vacía
const importe = (descripcion: string) =>
  z.number().nonnegative().max(MAX_MONTO).default(0).describe(descripcion);

//los saldos sí pueden ser negativos
const saldo = (descripcion: string) =>
  z.number().min(-MAX_MONTO).max(MAX_MONTO).describe(descripcion);

export const TransaccionIngresoEgresoSchema = z.object({
  fila: z
    .number()
    .int()
    .positive()
    .max(2147483647)
    .describe('Número de fila en el archivo original'),
  fecha: z.iso.date('La fecha debe ser válida (YYYY-MM-DD)'),
  concepto: z.string().min(1, 'El concepto es obligatorio'),
  cheque: z.string().optional().describe('Número de cheque'),
  comprobante: z.string().optional().describe('Número de comprobante'),
  cajaDebe: importe('Caja: debe'),
  cajaHaber: importe('Caja: haber'),
  cajaSaldo: saldo('Caja: saldo'),
  bancoDebe: importe('Banco: debe'),
  bancoHaber: importe('Banco: haber'),
  bancoSaldo: saldo('Banco: saldo'),
  egresoInc1: importe('Egresos: inciso 1'),
  egresoInc2: importe('Egresos: inciso 2'),
  egresoInc3: importe('Egresos: inciso 3'),
  egresoInc4: importe('Egresos: inciso 4'),
  egresoInc5: importe('Egresos: inciso 5'),
  ingresoMunicipal: importe('Ingresos: municipal'),
  ingresoOtras: importe('Ingresos: otras'),
  cuentasVariasConcepto: z.string().optional(),
  cuentasVariasDebe: importe('Cuentas varias: debe'),
  cuentasVariasHaber: importe('Cuentas varias: haber'),
});

export const IngestarIngresosEgresosSchema = z.object({
  numeroCuentaCte: z
    .string()
    .trim()
    .max(255)
    .optional()
    .describe(
      'N° de cuenta corriente del encabezado del archivo (informativo)',
    ),
  reemplazar: z
    .boolean()
    .default(false)
    .describe(
      'Si la rendición ya tiene el libro: false lo rechaza (409), true lo reemplaza',
    ),
  transacciones: z
    .array(TransaccionIngresoEgresoSchema)
    .min(1, 'Debe contener al menos una fila o transacción'),
});

export class IngestarIngresosEgresosDto extends createZodDto(
  IngestarIngresosEgresosSchema,
) {}
