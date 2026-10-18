import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Rol } from '../../../domain/enums/rol.enum.js';

//nunca incluye la contraseña
export const UsuarioResponseSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  dni: z.string(),
  email: z.string(),
  active: z.boolean(),
  roles: z.array(z.enum(Rol)),
  fechaCreacion: z.iso.datetime(),
});

export class UsuarioResponseDto extends createZodDto(UsuarioResponseSchema) {}
