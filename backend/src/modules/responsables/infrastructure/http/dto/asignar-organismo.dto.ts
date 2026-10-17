import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AsignarOrganismoSchema = z.object({
  organismoId: z.number().int().positive().max(2147483647),
});

export class AsignarOrganismoDto extends createZodDto(AsignarOrganismoSchema) {}
