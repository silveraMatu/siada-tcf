import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Rol } from '../../../../usuarios/domain/enums/rol.enum.js';

//contrato HTTP de salida: nunca incluye la contraseña (ni su hash)
export const UsuarioResponseSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  cuitDni: z.string(),
  email: z.string(),
  active: z.boolean(),
  roles: z.array(z.enum(Rol)),
  fechaCreacion: z.iso.datetime(),
});

export class UsuarioResponseDto extends createZodDto(UsuarioResponseSchema) {}
