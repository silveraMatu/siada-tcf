import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../../auth/infrastructure/security/jwt-auth.guard.js';
import { Roles } from '../../../auth/infrastructure/security/roles.decorator.js';
import { RolesGuard } from '../../../auth/infrastructure/security/roles.guard.js';
import { UsuarioActual } from '../../../auth/infrastructure/security/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../../auth/infrastructure/security/usuario-autenticado.js';
import { AccionActividad } from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';
import { ResultadoActividad } from '../../../registro-actividad/domain/enums/resultado-actividad.enum.js';
import { ActividadRegistrador } from '../../../registro-actividad/infrastructure/http/actividad-registrador.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import {
  ConsultarAsistenteUseCase,
  MENSAJE_ASISTENTE_NO_DISPONIBLE,
} from '../../application/use-cases/consultar-asistente.use-case.js';
import { ConsultarAsistenteDto } from './dto/consultar-asistente.dto.js';
import { RespuestaAsistenteDto } from './dto/respuesta-asistente.dto.js';
import { formatearSse } from './sse.js';

//el cliente cerró la conexión antes de que terminara la respuesta (convención de nginx; no es un código HTTP real)
const CODIGO_CLIENTE_SE_FUE = 499;

@ApiTags('Asistente')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
@ApiForbiddenResponse({
  description:
    'Requiere el rol ADMIN o AUDITOR, y que el organismo esté asignado al auditor',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.AUDITOR)
@Controller('asistente')
export class AsistenteController {
  constructor(
    private readonly consultarAsistenteUseCase: ConsultarAsistenteUseCase,
    private readonly registrador: ActividadRegistrador,
  ) {}

  @Post('consultas')
  @Registrar(AccionActividad.CONSULTA_IA)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preguntarle al copiloto de IA sobre un organismo',
    description:
      'El copiloto responde con los datos del organismo (consultas de solo lectura limitadas a ese organismo). `organismoId` es opcional: si falta se usa el único organismo asignado al auditor; si no tiene ninguno, el copiloto responde que no está auditando ningún organismo. `cuentaMensualId` ancla la consulta a una rendición del organismo. `pasos` cuenta, en lenguaje natural, qué hizo el copiloto para responder (nunca incluye SQL ni datos). Cada consulta es independiente (sin historial). Para ver los pasos mientras ocurren, usar `consultas/stream`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Respuesta del copiloto y su razonamiento',
    type: RespuestaAsistenteDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, o el auditor tiene más de un organismo y no indicó cuál',
  })
  @ApiResponse({
    status: 404,
    description:
      'El organismo no existe, o la cuenta mensual no es de ese organismo',
  })
  @ApiResponse({
    status: 502,
    description: 'El servicio de IA no está disponible',
  })
  @ApiResponse({ status: 503, description: 'El asistente no está configurado' })
  async consultar(
    @Body() dto: ConsultarAsistenteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<RespuestaAsistenteDto> {
    return this.consultarAsistenteUseCase.execute({
      actor: { usuarioId: usuario.id, roles: usuario.roles },
      pregunta: dto.pregunta,
      organismoId: dto.organismoId,
      cuentaMensualId: dto.cuentaMensualId,
    });
  }

  @Post('consultas/stream')
  @Registrar(AccionActividad.CONSULTA_IA)
  @ApiProduces('text/event-stream')
  @ApiOperation({
    summary: 'Preguntarle al copiloto y ver su razonamiento mientras trabaja',
    description:
      'Mismo pedido y mismos permisos que `consultas`, pero la respuesta es un flujo `text/event-stream` (Server-Sent Events). Hay que consumirlo con `fetch` y leer el cuerpo, no con `EventSource` (no permite POST ni el header Authorization). Eventos, en este orden: `pensando` {mensaje} (al empezar y entre pasos), `paso` {id, accion, descripcion, fuentes, estado, resultado, cantidadRegistros, duracionMs, parcial} (cada paso llega primero con estado `en_curso` y luego con el mismo `id` y su estado final), `respuesta` {respuesta, organismoId} y `fin` {}. Si algo falla una vez empezado el flujo llega `error` {mensaje} y se cierra. Las líneas que empiezan con `:` son keepalive. Los errores previos al flujo (400, 401, 403, 404, 502, 503) son respuestas HTTP normales. Si el cliente corta la conexión, el copiloto deja de trabajar. Los textos son planos (sin markdown) salvo `respuesta`, que puede traer markdown.',
  })
  @ApiResponse({
    status: 200,
    description: 'Flujo de eventos (text/event-stream)',
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos, o el auditor tiene más de un organismo y no indicó cuál',
  })
  @ApiResponse({
    status: 404,
    description:
      'El organismo no existe, o la cuenta mensual no es de ese organismo',
  })
  @ApiResponse({
    status: 502,
    description: 'El servicio de IA no está disponible',
  })
  @ApiResponse({ status: 503, description: 'El asistente no está configurado' })
  async transmitir(
    @Body() dto: ConsultarAsistenteDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    //antes de emitir nada: todo lo que puede fallar con un código HTTP normal (400, 403, 404, 502, 503)
    const preparada = await this.consultarAsistenteUseCase.preparar({
      actor: { usuarioId: usuario.id, roles: usuario.roles },
      pregunta: dto.pregunta,
      organismoId: dto.organismoId,
      cuentaMensualId: dto.cuentaMensualId,
    });
    //si el cliente se va antes de que termine, se corta también la llamada al servicio de IA
    const cancelacion = new AbortController();
    res.on('close', () => {
      if (!res.writableEnded) cancelacion.abort();
    });
    const eventos = await this.consultarAsistenteUseCase.transmitir(
      preparada,
      cancelacion.signal,
    );

    res.status(HttpStatus.OK);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let resultado = ResultadoActividad.EXITO;
    let codigoHttp: number = HttpStatus.OK;
    try {
      for await (const evento of eventos) {
        const { tipo, ...datos } = evento;
        res.write(formatearSse(tipo, tipo === 'paso' ? evento.paso : datos));
      }
      res.write(formatearSse('fin', {}));
    } catch {
      resultado = ResultadoActividad.FALLO;
      if (cancelacion.signal.aborted) {
        codigoHttp = CODIGO_CLIENTE_SE_FUE;
      } else {
        //la cabecera ya salió con 200: el fallo viaja dentro del flujo
        codigoHttp = HttpStatus.BAD_GATEWAY;
        res.write(
          formatearSse('error', { mensaje: MENSAJE_ASISTENTE_NO_DISPONIBLE }),
        );
      }
    }
    //el interceptor registra al terminar el handler, que es después de cerrar la respuesta; acá se registra antes
    //(es idempotente por petición: el interceptor queda sin efecto) para que el evento exista cuando el cliente termina
    await this.registrador.registrarEvento(req, resultado, codigoHttp);
    res.end();
  }
}
