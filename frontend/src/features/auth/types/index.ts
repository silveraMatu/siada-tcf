import { z } from 'zod';

// Bcrypt solo usa los primeros 72 bytes: es el tope de contraseña que acepta la API.
const MAX_PASSWORD_BYTES = 72;

export const quitarSeparadoresDni = (dni: string) => dni.replace(/[-.\s]/g, '');

/** Espeja las reglas de `POST /auth/registro` para dar feedback inmediato. */
export const RegistroSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(255, 'El nombre no puede superar los 255 caracteres'),
  apellido: z
    .string()
    .trim()
    .min(1, 'El apellido es obligatorio')
    .max(255, 'El apellido no puede superar los 255 caracteres'),
  dni: z
    .string()
    .trim()
    .min(1, 'El DNI es obligatorio')
    .refine(
      (valor) => /^\d{7,8}$/.test(quitarSeparadoresDni(valor)),
      'El DNI debe tener 7 u 8 dígitos',
    ),
  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio')
    .max(255, 'El email no puede superar los 255 caracteres')
    .pipe(z.email('El email no es válido')),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine(
      (valor) => new TextEncoder().encode(valor).length <= MAX_PASSWORD_BYTES,
      `La contraseña no puede superar los ${MAX_PASSWORD_BYTES} bytes`,
    ),
});

export type RegistroFormValues = z.infer<typeof RegistroSchema>;

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'El email es obligatorio')
    .pipe(z.email('El email no es válido')),
  // Sin largo mínimo: no se expone la política de contraseñas al iniciar sesión.
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginFormValues = z.infer<typeof LoginSchema>;

export interface LoginResponse {
  accessToken: string;
}
