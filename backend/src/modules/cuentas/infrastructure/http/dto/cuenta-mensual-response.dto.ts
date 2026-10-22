import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EstadoCuentaMensual } from '../../../domain/enums/estado-cuenta-mensual.enum.js';

export const CuentaMensualResponseSchema = z.object({
  id: z.number().int(),
  mes: z.number().int(),
  cuentaAnualId: z.number().int(),
  estado: z.enum(EstadoCuentaMensual),
  fechaCreacion: z.iso.datetime(),
});

export class CuentaMensualResponseDto extends createZodDto(
  CuentaMensualResponseSchema,
) {}

//listado: la cuenta con el organismo y el ejercicio a los que pertenece
export const CuentaMensualListadaResponseSchema =
  CuentaMensualResponseSchema.extend({
    organismoId: z.number().int(),
    organismoNombre: z.string(),
    ejercicioFiscal: z.number().int(),
  });

export class CuentaMensualListadaResponseDto extends createZodDto(
  CuentaMensualListadaResponseSchema,
) {}
