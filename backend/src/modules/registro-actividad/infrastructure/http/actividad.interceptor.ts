import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import type { Request } from 'express';
import { Observable, mergeMap } from 'rxjs';
import { ResultadoActividad } from '../../domain/enums/resultado-actividad.enum.js';
import { ActividadRegistrador } from './actividad-registrador.js';
import { estadosPeticion } from './estado-peticion.js';

//registra las peticiones marcadas que terminan bien, antes de devolver la respuesta
//(los rechazos y errores los registra ActividadFilter)
@Injectable()
export class ActividadInterceptor implements NestInterceptor {
  constructor(private readonly registrador: ActividadRegistrador) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!estadosPeticion.get(request)?.meta) return next.handle();

    //Nest aplica el código HTTP recién después de los interceptores: se deduce igual que él
    const codigoHttp =
      Reflect.getMetadata(HTTP_CODE_METADATA, context.getHandler()) ??
      (request.method === 'POST' ? 201 : 200);

    return next.handle().pipe(
      mergeMap(async (cuerpo: unknown) => {
        await this.registrador.registrarEvento(
          request,
          ResultadoActividad.EXITO,
          codigoHttp as number,
          cuerpo,
        );
        return cuerpo;
      }),
    );
  }
}
