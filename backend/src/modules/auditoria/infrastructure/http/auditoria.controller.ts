import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/infrastructure/security/jwt-auth.guard.js';
import { Roles } from '../../../auth/infrastructure/security/roles.decorator.js';
import { RolesGuard } from '../../../auth/infrastructure/security/roles.guard.js';
import { UsuarioActual } from '../../../auth/infrastructure/security/usuario-actual.decorator.js';
import type { UsuarioAutenticado } from '../../../auth/infrastructure/security/usuario-autenticado.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { CerrarAuditoriaUseCase } from '../../application/use-cases/cerrar-auditoria.use-case.js';
import { EjecutarAuditoriaUseCase } from '../../application/use-cases/ejecutar-auditoria.use-case.js';
import { ObtenerEjecucionUseCase } from '../../application/use-cases/obtener-ejecucion.use-case.js';
import { ListarObservacionesUseCase } from '../../application/use-cases/listar-observaciones.use-case.js';
import {
  descripcionRegla,
  EstadoObservacion,
} from '../../domain/rules/validations.js';
import type { ResultadoValidacion } from '../../domain/types/auditoria.types.js';
import type { EjecucionDetallada } from '../../application/use-cases/obtener-ejecucion.use-case.js';
import { AuditoriaParamsDto } from './dto/auditoria-params.dto.js';
import { CerrarAuditoriaDto } from './dto/cerrar-auditoria.dto.js';
import { EjecucionResponseDto } from './dto/ejecucion-response.dto.js';
import { ObservacionResponseDto } from './dto/observacion-response.dto.js';
import { aObservacionResponse } from './observacion-response.mapper.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';
import { ResultadoValidacionResponseDto } from './dto/resultado-validacion-response.dto.js';

@ApiTags('Auditoría')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
@ApiForbiddenResponse({
  description:
    'Requiere el rol ADMIN o AUDITOR, y que el organismo de la cuenta esté asignado al auditor',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.AUDITOR)
@Controller('auditoria/cuentas-mensuales/:cuentaMensualId')
export class AuditoriaController {
  constructor(
    private readonly ejecutarAuditoriaUseCase: EjecutarAuditoriaUseCase,
    private readonly obtenerEjecucionUseCase: ObtenerEjecucionUseCase,
    private readonly cerrarAuditoriaUseCase: CerrarAuditoriaUseCase,
    private readonly listarObservacionesUseCase: ListarObservacionesUseCase,
  ) {}

  private toResultadoResponse(
    resultado: ResultadoValidacion,
  ): ResultadoValidacionResponseDto {
    return {
      codigoRegla: resultado.codigoRegla,
      descripcion: descripcionRegla[resultado.codigoRegla],
      estado: resultado.estado,
      mensaje: resultado.mensaje,
      observaciones: resultado.observaciones.map((o) =>
        aObservacionResponse(o),
      ),
      filasEvaluadas: resultado.filasEvaluadas,
      librosFaltantes: resultado.librosFaltantes,
    };
  }

  @Post('documentos/auditar')
  @Registrar(AccionActividad.AUDITORIA_EJECUTADA, {
    entidad: TipoEntidadActividad.CUENTA_MENSUAL,
    idParam: 'cuentaMensualId',
    cuentaParam: 'cuentaMensualId',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Auditar los documentos de una rendición presentada',
    description:
      'El auditor toma la rendición (LISTO_PARA_AUDITAR → EN_AUDITORIA) y el motor corre las reglas sobre sus documentos. Devuelve un resultado por regla: VERIFICADO, FALLO (con sus observaciones) o FALTAN_LIBROS. La ejecución queda guardada. Es idempotente: con la misma versión de reglas devuelve la ejecución existente, con las revisiones del auditor; si cambió la versión de reglas, guarda una nueva.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado de cada regla de la ejecución vigente',
    type: [ResultadoValidacionResponseDto],
  })
  @ApiResponse({ status: 400, description: 'ID de cuenta mensual inválido' })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  @ApiResponse({
    status: 409,
    description:
      'La rendición todavía no fue presentada, o su auditoría ya fue cerrada',
  })
  async auditar(
    @Param() { cuentaMensualId }: AuditoriaParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ResultadoValidacionResponseDto[]> {
    const { resultados } = await this.ejecutarAuditoriaUseCase.execute(
      cuentaMensualId,
      { usuarioId: usuario.id, roles: usuario.roles },
    );
    return resultados.map((r) => this.toResultadoResponse(r));
  }

  private toEjecucionResponse({
    ejecucion,
    resultados,
    conteo,
  }: EjecucionDetallada): EjecucionResponseDto {
    return {
      id: ejecucion.id!,
      cuentaMensualId: ejecucion.cuentaMensualId,
      versionReglas: ejecucion.versionReglas,
      ejecutadaPorId: ejecucion.ejecutadaPorId,
      ejecutadaEn: ejecucion.ejecutadaEn!.toISOString(),
      cerradaEn: ejecucion.cerradaEn?.toISOString() ?? null,
      cerradaPorId: ejecucion.cerradaPorId,
      conclusion: ejecucion.conclusion,
      estadoFinal: ejecucion.estadoFinal as
        'AUDITADA' | 'CON_OBSERVACIONES' | null,
      resultados: resultados.map((r) => this.toResultadoResponse(r)),
      observaciones: {
        abiertas: conteo[EstadoObservacion.ABIERTA],
        confirmadas: conteo[EstadoObservacion.CONFIRMADA],
        descartadas: conteo[EstadoObservacion.DESCARTADA],
      },
    };
  }

  @Get('ejecucion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener la última ejecución de la auditoría de una rendición',
    description:
      'Con los resultados de cada regla, cuántas observaciones hay abiertas, confirmadas y descartadas, y los datos del cierre si ya se cerró.',
  })
  @ApiResponse({ status: 200, type: EjecucionResponseDto })
  @ApiResponse({
    status: 404,
    description: 'La cuenta no existe o todavía no se auditó',
  })
  async obtenerEjecucion(
    @Param() { cuentaMensualId }: AuditoriaParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<EjecucionResponseDto> {
    return this.toEjecucionResponse(
      await this.obtenerEjecucionUseCase.execute(cuentaMensualId, {
        usuarioId: usuario.id,
        roles: usuario.roles,
      }),
    );
  }

  @Get('observaciones')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar las observaciones de la última ejecución de una rendición',
  })
  @ApiResponse({
    status: 200,
    description:
      'Observaciones recuperadas exitosamente (lista vacía si todavía no se auditó o no hay ninguna)',
    type: [ObservacionResponseDto],
  })
  @ApiResponse({ status: 400, description: 'ID de cuenta mensual inválido' })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  async listarObservaciones(
    @Param() { cuentaMensualId }: AuditoriaParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ObservacionResponseDto[]> {
    const observaciones = await this.listarObservacionesUseCase.execute(
      cuentaMensualId,
      { usuarioId: usuario.id, roles: usuario.roles },
    );
    return observaciones.map((o) => aObservacionResponse(o));
  }

  @Post('cerrar')
  @Registrar(AccionActividad.AUDITORIA_CERRADA, {
    entidad: TipoEntidadActividad.CUENTA_MENSUAL,
    idParam: 'cuentaMensualId',
    cuentaParam: 'cuentaMensualId',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cerrar la auditoría de una rendición',
    description:
      'Cuando el auditor revisó todas las observaciones (ninguna ABIERTA). La rendición queda AUDITADA si no se confirmó ninguna, o CON_OBSERVACIONES si hay al menos una confirmada, y la conclusión queda guardada en la ejecución. Devuelve la ejecución con los datos del cierre.',
  })
  @ApiResponse({ status: 200, type: EjecucionResponseDto })
  @ApiResponse({ status: 400, description: 'Falta la conclusión' })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  @ApiResponse({
    status: 409,
    description:
      'La auditoría no está en curso, ya fue cerrada, o quedan observaciones sin revisar',
  })
  async cerrar(
    @Param() { cuentaMensualId }: AuditoriaParamsDto,
    @Body() { conclusion }: CerrarAuditoriaDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<EjecucionResponseDto> {
    const actor = { usuarioId: usuario.id, roles: usuario.roles };
    await this.cerrarAuditoriaUseCase.execute(
      cuentaMensualId,
      conclusion,
      actor,
    );
    return this.toEjecucionResponse(
      await this.obtenerEjecucionUseCase.execute(cuentaMensualId, actor),
    );
  }
}
