import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TransaccionIngresoEgresoResponseSchema = z.object({
  id: z.number().int(),
  fila: z.number().int(),
  fecha: z.string(),
  concepto: z.string(),
  cheque: z.string().nullable(),
  comprobante: z.string().nullable(),
  cajaDebe: z.number(),
  cajaHaber: z.number(),
  cajaSaldo: z.number(),
  bancoDebe: z.number(),
  bancoHaber: z.number(),
  bancoSaldo: z.number(),
  egresoInc1: z.number(),
  egresoInc2: z.number(),
  egresoInc3: z.number(),
  egresoInc4: z.number(),
  egresoInc5: z.number(),
  ingresoMunicipal: z.number(),
  ingresoOtras: z.number(),
  cuentasVariasConcepto: z.string().nullable(),
  cuentasVariasDebe: z.number(),
  cuentasVariasHaber: z.number(),
});

export const IngresosEgresosResponseSchema = z.object({
  id: z.number().int(),
  cuentaMensualId: z.number().int(),
  numeroCuentaCte: z.string().nullable(),
  fechaCreacion: z.iso.datetime(),
  transacciones: z.array(TransaccionIngresoEgresoResponseSchema),
});

export class IngresosEgresosResponseDto extends createZodDto(
  IngresosEgresosResponseSchema,
) {}
