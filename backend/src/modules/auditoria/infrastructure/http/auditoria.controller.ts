import {
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
import { BuscarIngresosEgresosUseCase } from '../../../ingresos-egresos/application/use-cases/buscar-ingresos-egresos.use-case.js';
import { ObtenerLibroBancoUseCase } from '../../../libro-banco/application/use-cases/obtener-libro-banco.use-case.js';
import { AuditarLibroBancoUseCase } from '../../application/use-cases/auditar-libro-banco.use-case.js';
import { ListarObservacionesUseCase } from '../../application/use-cases/listar-observaciones.use-case.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { descripcionRegla } from '../../domain/rules/validations.js';
import type { ResultadoValidacion } from '../../domain/types/auditoria.types.js';
import { AuditoriaParamsDto } from './dto/auditoria-params.dto.js';
import { ObservacionResponseDto } from './dto/observacion-response.dto.js';
import { ResultadoValidacionResponseDto } from './dto/resultado-validacion-response.dto.js';

@ApiTags('Auditoría')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
@ApiForbiddenResponse({ description: 'Requiere el rol ADMIN o AUDITOR' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.AUDITOR)
@Controller('auditoria/cuentas-mensuales/:cuentaMensualId')
export class AuditoriaController {
  constructor(
    private readonly obtenerLibroBancoUseCase: ObtenerLibroBancoUseCase,
    private readonly buscarIngresosEgresosUseCase: BuscarIngresosEgresosUseCase,
    private readonly auditarLibroBancoUseCase: AuditarLibroBancoUseCase,
    private readonly listarObservacionesUseCase: ListarObservacionesUseCase,
  ) {}

  private toResponse(observacion: Observaciones): ObservacionResponseDto {
    return {
      id: observacion.id!,
      cuentaMensualId: observacion.cuentaMensualId,
      codigoRegla: observacion.codigoRegla,
      tipo: observacion.tipo,
      descripcion: observacion.descripcion,
      libroOrigen: observacion.libroOrigen,
      estado: observacion.estado,
      transaccionId: observacion.transaccionId ?? null,
      transaccionIngresoEgresoId:
        observacion.transaccionIngresoEgresoId ?? null,
    };
  }

  private toResultadoResponse(
    resultado: ResultadoValidacion,
  ): ResultadoValidacionResponseDto {
    return {
      codigoRegla: resultado.codigoRegla,
      descripcion: descripcionRegla[resultado.codigoRegla],
      estado: resultado.estado,
      mensaje: resultado.mensaje,
      observaciones: resultado.observaciones.map((o) => this.toResponse(o)),
      filasEvaluadas: resultado.filasEvaluadas,
      librosFaltantes: resultado.librosFaltantes,
    };
  }

  @Post('libro-banco/ejecutar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ejecutar manualmente la auditoría del Libro Banco de una cuenta mensual (endpoint temporal de prueba)',
    description:
      'Corre las reglas disponibles y persiste los hallazgos. Devuelve un resultado por regla: VERIFICADO (sin hallazgos), FALLO (con sus observaciones) o FALTAN_LIBROS (la regla no corrió porque falta un libro requerido, ej. un mes sin libro banco). Es idempotente: re-ejecutar no duplica observaciones.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Resultado de cada regla; en los FALLO, las observaciones (nuevas y ya existentes)',
    type: [ResultadoValidacionResponseDto],
  })
  @ApiResponse({ status: 400, description: 'ID de cuenta mensual inválido' })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  async ejecutarLibroBanco(
    @Param() { cuentaMensualId }: AuditoriaParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ResultadoValidacionResponseDto[]> {
    //TODO: endpoint temporal, la auditoría se disparará desde el flujo de la cuenta mensual
    //también verifica que el AUDITOR tenga asignado el organismo de la cuenta
    const libros = await this.obtenerLibroBancoUseCase.execute(
      cuentaMensualId,
      {
        usuarioId: usuario.id,
        roles: usuario.roles,
      },
    );
    const ingresosEgresos =
      await this.buscarIngresosEgresosUseCase.execute(cuentaMensualId);
    const resultados = await this.auditarLibroBancoUseCase.execute(
      cuentaMensualId,
      libros,
      ingresosEgresos ?? undefined,
    );
    return resultados.map((r) => this.toResultadoResponse(r));
  }

  @Get('observaciones')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar las observaciones de una cuenta mensual',
  })
  @ApiResponse({
    status: 200,
    description:
      'Observaciones recuperadas exitosamente (lista vacía si no hay ninguna)',
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
    return observaciones.map((o) => this.toResponse(o));
  }
}
