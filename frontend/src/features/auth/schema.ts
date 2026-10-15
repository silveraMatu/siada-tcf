import { z } from 'zod'

// Centraliza las reglas de validación y el tipo que comparte el formulario.
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingrese su correo electrónico o usuario.'),
  password: z.string().min(1, 'Ingrese su contraseña.'),
})

export type LoginSchemaType = z.infer<typeof loginSchema>
