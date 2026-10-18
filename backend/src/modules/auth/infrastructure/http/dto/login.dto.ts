import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//mismo tope que el registro: bcrypt solo usa los primeros 72 bytes
const MAX_PASSWORD_BYTES = 72;

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(255, { message: 'El email no puede superar los 255 caracteres' })
    .pipe(z.email({ message: 'El email no es válido' })),
  //sin largo minimo para no exponer la politica de contraseñas
  password: z
    .string()
    .min(1, { message: 'La contraseña es obligatoria' })
    .refine((valor) => Buffer.byteLength(valor, 'utf8') <= MAX_PASSWORD_BYTES, {
      message: `La contraseña no puede superar los ${MAX_PASSWORD_BYTES} bytes`,
    }),
});

export class LoginDto extends createZodDto(LoginSchema) {}
