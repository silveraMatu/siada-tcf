import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//fechaCreacion viaja como string ISO 8601 (z.date() no se puede documentar en OpenAPI)
export const OrganismoResponseSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  rubro: z.string(),
  active: z.boolean(),
  fechaCreacion: z.iso.datetime(),
});

export class OrganismoResponseDto extends createZodDto(
  OrganismoResponseSchema,
) {}
