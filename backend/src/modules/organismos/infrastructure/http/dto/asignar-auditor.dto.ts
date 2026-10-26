import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AsignarAuditorSchema = z.object({
  auditorId: z.number().int().positive().max(2147483647),
});

export class AsignarAuditorDto extends createZodDto(AsignarAuditorSchema) {}
