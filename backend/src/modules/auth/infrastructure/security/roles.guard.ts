import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { ROLES_KEY } from './roles.decorator.js';
import type { UsuarioAutenticado } from './usuario-autenticado.js';

//se usa despues de JwtAuthGuard, que es quien deja el usuario en request.user
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requeridos?.length) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: UsuarioAutenticado }>();
    if (!user || !requeridos.some((rol) => user.roles.includes(rol))) {
      throw new ForbiddenException(
        'No tiene permisos para realizar esta acción',
      );
    }
    return true;
  }
}
