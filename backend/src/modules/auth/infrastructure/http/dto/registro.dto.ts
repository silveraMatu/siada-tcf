import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//`active` y `roles` no se aceptan: el usuario nace inactivo y sin roles hasta que un administrador lo apruebe
//bcrypt solo considera los primeros 72 bytes de la contraseña, por eso ese es el tope
const MAX_PASSWORD_BYTES = 72;

export const RegistroSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, { message: 'El nombre es obligatorio' })
    .max(255, { message: 'El nombre no puede superar los 255 caracteres' }),
  apellido: z
    .string()
    .trim()
    .min(1, { message: 'El apellido es obligatorio' })
    .max(255, { message: 'El apellido no puede superar los 255 caracteres' }),
  //se quitan separadores ('20-12345678-9' => '20123456789') para que la unicidad no se eluda por formato
  cuitDni: z
    .string()
    .trim()
    .min(1, { message: 'El CUIT/DNI es obligatorio' })
    .transform((valor) => valor.replace(/[-.\s]/g, ''))
    .pipe(
      z.string().regex(/^(\d{7,8}|\d{11})$/, {
        message:
          'El CUIT/DNI debe tener 7 u 8 dígitos (DNI) o 11 dígitos (CUIT)',
      }),
    ),
  //en minúsculas para que la unicidad no dependa de las mayúsculas
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, { message: 'El email no puede superar los 255 caracteres' })
    .pipe(z.email({ message: 'El email no es válido' })),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
    .refine((valor) => Buffer.byteLength(valor, 'utf8') <= MAX_PASSWORD_BYTES, {
      message: `La contraseña no puede superar los ${MAX_PASSWORD_BYTES} bytes`,
    }),
});

export class RegistroDto extends createZodDto(RegistroSchema) {}
