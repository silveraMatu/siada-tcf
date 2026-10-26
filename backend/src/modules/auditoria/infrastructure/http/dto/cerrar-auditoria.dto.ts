import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CerrarAuditoriaSchema = z.object({
  conclusion: z
    .string()
    .trim()
    .min(1, { message: 'La conclusión es obligatoria' })
    .max(5000, {
      message: 'La conclusión no puede superar los 5000 caracteres',
    })
    .describe('Conclusión del auditor sobre la rendición'),
});

export class CerrarAuditoriaDto extends createZodDto(CerrarAuditoriaSchema) {}
