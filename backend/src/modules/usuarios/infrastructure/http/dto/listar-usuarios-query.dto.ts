import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//'true'/'false' pasan a booleano; cualquier otro valor es 400
export const ListarUsuariosQuerySchema = z.object({
  active: z
    .enum(['true', 'false'], {
      message: 'El filtro active debe ser true o false',
    })
    .transform((valor) => valor === 'true')
    .optional(),
});

export class ListarUsuariosQueryDto extends createZodDto(
  ListarUsuariosQuerySchema,
) {}
