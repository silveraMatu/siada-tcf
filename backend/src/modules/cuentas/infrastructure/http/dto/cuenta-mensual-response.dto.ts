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
