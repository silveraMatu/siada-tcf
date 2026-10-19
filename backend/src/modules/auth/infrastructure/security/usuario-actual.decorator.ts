import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UsuarioAutenticado } from './usuario-autenticado.js';

//usuario que JwtStrategy dejo en request.user; solo usar en rutas con JwtAuthGuard
export const UsuarioActual = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UsuarioAutenticado =>
    context.switchToHttp().getRequest<{ user: UsuarioAutenticado }>().user,
);
