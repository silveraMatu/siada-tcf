import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//bcrypt solo usa los primeros 72 bytes: ese es el tope de la contraseña
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
  //solo DNI y sin separadores: evita registrar a la misma persona dos veces
  dni: z
    .string()
    .trim()
    .min(1, { message: 'El DNI es obligatorio' })
    .transform((valor) => valor.replace(/[-.\s]/g, ''))
    .pipe(
      z.string().regex(/^\d{7,8}$/, {
        message: 'El DNI debe tener 7 u 8 dígitos',
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
