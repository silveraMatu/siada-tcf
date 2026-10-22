import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EstadoCuentaMensual } from '../../../domain/enums/estado-cuenta-mensual.enum.js';

//cualquier estado que no sea uno de los cinco es 400
export const ListarCuentasMensualesQuerySchema = z.object({
  estado: z
    .enum(EstadoCuentaMensual, {
      message: `El filtro estado debe ser uno de: ${Object.values(EstadoCuentaMensual).join(', ')}`,
    })
    .optional(),
});

export class ListarCuentasMensualesQueryDto extends createZodDto(
  ListarCuentasMensualesQuerySchema,
) {}
