import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//la query llega como string: 'true'/'false' se convierte a booleano y cualquier otro valor es un 400
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
