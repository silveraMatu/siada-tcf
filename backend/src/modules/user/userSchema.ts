import { z } from 'zod';

export const UserRoleSchema = z.enum(['JUEZ_TRAMITE', 'AUDITOR', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

//DTO para la creacion del usuario
export const CreateUserSchema = z.object({
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  email: z.string().email('Formato de correo electrónico inválido'),
  password: z
    .string()
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: UserRoleSchema.default('AUDITOR'),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>;

//DTO Respuesta segura
export const UserResponseSchema = z.object({
  id: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  role: UserRoleSchema,
  active: z.boolean(),
  createdAt: z.date().or(z.string()),
});

export type UserResponseDTO = z.infer<typeof UserResponseSchema>;