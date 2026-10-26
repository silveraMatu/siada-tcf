import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClsService } from 'nestjs-cls';
import { ContextoActividad } from '../../domain/entities/contexto-actividad.domain.js';
import { CLAVE_CONTEXTO_ACTIVIDAD } from '../adapters/driven/contexto/cls-contexto-actividad.adapter.js';
import { estadosPeticion } from './estado-peticion.js';
import {
  REGISTRAR_KEY,
  type OpcionesRegistrar,
} from './registrar.decorator.js';

//guard global: corre antes que los de autenticación y permisos. No decide nada (siempre deja pasar):
//prepara el contexto de la petición y recuerda qué declaró el endpoint
@Injectable()
export class ActividadGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly cls: ClsService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<object>();
    const contexto = new ContextoActividad();
    const idPino = (request as { id?: string | number }).id;
    contexto.requestId =
      idPino !== undefined ? String(idPino) : (this.cls.getId() ?? null);
    if (this.cls.isActive()) this.cls.set(CLAVE_CONTEXTO_ACTIVIDAD, contexto);

    estadosPeticion.set(request, {
      meta: this.reflector.get<OpcionesRegistrar | undefined>(
        REGISTRAR_KEY,
        context.getHandler(),
      ),
      contexto,
    });
    return true;
  }
}
