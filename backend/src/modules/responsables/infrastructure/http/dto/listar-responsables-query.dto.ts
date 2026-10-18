import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//'true'/'false' pasan a booleano; cualquier otro valor es 400
export const ListarResponsablesQuerySchema = z.object({
  sinOrganismo: z
    .enum(['true', 'false'], {
      message: 'El filtro sinOrganismo debe ser true o false',
    })
    .transform((valor) => valor === 'true')
    .optional(),
});

export class ListarResponsablesQueryDto extends createZodDto(
  ListarResponsablesQuerySchema,
) {}
