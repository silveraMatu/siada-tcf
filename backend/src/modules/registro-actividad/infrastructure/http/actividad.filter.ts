import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import { ActividadRegistrador } from './actividad-registrador.js';

//registra los errores y rechazos de las peticiones marcadas, incluidos los 401/403 de los guards (que
//fallan antes de llegar a los interceptores), y deja que Nest arme la respuesta como siempre
@Catch()
export class ActividadFilter extends BaseExceptionFilter {
  constructor(private readonly registrador: ActividadRegistrador) {
    super();
  }

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const request = host.switchToHttp().getRequest<Request>();
    const codigoHttp =
      exception instanceof HttpException ? exception.getStatus() : 500;

    await this.registrador.registrarEvento(
      request,
      ActividadRegistrador.resultadoDe(codigoHttp),
      codigoHttp,
    );
    super.catch(exception, host);
  }
}
