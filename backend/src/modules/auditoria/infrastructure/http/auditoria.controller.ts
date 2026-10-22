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
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { ObtenerLibroBancoUseCase } from '../../../libro-banco/application/use-cases/obtener-libro-banco.use-case.js';
import { AuditarLibroBancoUseCase } from '../../application/use-cases/auditar-libro-banco.use-case.js';
import { ListarObservacionesUseCase } from '../../application/use-cases/listar-observaciones.use-case.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { AuditoriaParamsDto } from './dto/auditoria-params.dto.js';
import { ObservacionResponseDto } from './dto/observacion-response.dto.js';

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
    };
  }

  @Post('libro-banco/ejecutar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Ejecutar manualmente la auditoría del Libro Banco de una cuenta mensual (endpoint temporal de prueba)',
    description:
      'Corre las reglas internas sobre todos los libros banco del mes y persiste los hallazgos. Es idempotente: re-ejecutar no duplica observaciones. Devuelve lista vacía si no hay libros o no hay hallazgos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Observaciones del libro banco (nuevas y ya existentes)',
    type: [ObservacionResponseDto],
  })
  @ApiResponse({ status: 400, description: 'ID de cuenta mensual inválido' })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  async ejecutarLibroBanco(
    @Param() { cuentaMensualId }: AuditoriaParamsDto,
  ): Promise<ObservacionResponseDto[]> {
    //TODO: endpoint temporal, la auditoría se disparará desde el flujo de la cuenta mensual
    const libros = await this.obtenerLibroBancoUseCase.execute(cuentaMensualId);
    const observaciones = await this.auditarLibroBancoUseCase.execute(
      cuentaMensualId,
      libros,
    );
    return observaciones.map((o) => this.toResponse(o));
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
  ): Promise<ObservacionResponseDto[]> {
    const observaciones =
      await this.listarObservacionesUseCase.execute(cuentaMensualId);
    return observaciones.map((o) => this.toResponse(o));
  }
}
