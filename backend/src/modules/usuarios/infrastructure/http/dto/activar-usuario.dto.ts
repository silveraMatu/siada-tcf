import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Rol } from '../../../domain/enums/rol.enum.js';

//los roles reemplazan a los actuales. Regla: un usuario activo debe tener al menos un rol;
//un usuario inactivo puede tener cualquier combinacion de roles (incluso ninguno)
export const ActivarUsuarioSchema = z
  .object({
    active: z.boolean({
      message: 'El estado active es obligatorio (true o false)',
    }),
    roles: z
      .array(z.enum(Rol, { message: 'Alguno de los roles no es válido' }), {
        message: 'Los roles son obligatorios (arreglo)',
      })
      //sin repetidos
      .transform((roles) => [...new Set(roles)]),
  })
  .refine(({ active, roles }) => !active || roles.length > 0, {
    message: 'Un usuario activo debe tener al menos un rol',
    path: ['roles'],
  });

export class ActivarUsuarioDto extends createZodDto(ActivarUsuarioSchema) {}
