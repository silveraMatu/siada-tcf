import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
});

export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}
