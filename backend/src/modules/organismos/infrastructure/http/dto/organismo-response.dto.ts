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

//listado del juez y del administrador: suma el auditor asignado (el responsable no ve esos datos)
export const OrganismoConAuditorResponseSchema = OrganismoResponseSchema.extend(
  {
    auditorId: z
      .number()
      .int()
      .nullable()
      .describe('Auditor asignado al organismo; null si no tiene'),
    auditor: z
      .object({
        id: z.number().int(),
        nombre: z.string(),
        apellido: z.string(),
      })
      .nullable(),
  },
);

export class OrganismoConAuditorResponseDto extends createZodDto(
  OrganismoConAuditorResponseSchema,
) {}
