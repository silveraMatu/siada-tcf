import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { RevisarObservacionUseCase } from '../../application/use-cases/revisar-observacion.use-case.js';
import { ObservacionResponseDto } from './dto/observacion-response.dto.js';
import {
  ObservacionParamsDto,
  RevisarObservacionDto,
} from './dto/revisar-observacion.dto.js';
import { aObservacionResponse } from './observacion-response.mapper.js';

@ApiTags('Auditoría')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
@ApiForbiddenResponse({
  description:
    'Requiere el rol ADMIN o AUDITOR, y que el organismo de la cuenta esté asignado al auditor',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN, Rol.AUDITOR)
@Controller('auditoria/observaciones')
export class ObservacionesController {
  constructor(
    private readonly revisarObservacionUseCase: RevisarObservacionUseCase,
  ) {}

  @Patch(':observacionId')
  @Registrar(AccionActividad.OBSERVACION_REVISADA, {
    entidad: TipoEntidadActividad.OBSERVACION,
    idParam: 'observacionId',
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Confirmar, descartar o reabrir una observación',
    description:
      'El auditor decide qué hacer con cada hallazgo del motor: CONFIRMAR, DESCARTAR (con motivo obligatorio) o REABRIR para volver a dejarla ABIERTA. Solo mientras la auditoría está en curso y sobre las observaciones de la última ejecución.',
  })
  @ApiResponse({ status: 200, type: ObservacionResponseDto })
  @ApiResponse({
    status: 400,
    description: 'Decisión inválida o falta el motivo al descartar',
  })
  @ApiResponse({ status: 404, description: 'La observación no existe' })
  @ApiResponse({
    status: 409,
    description:
      'La auditoría no está en curso, ya fue cerrada, o la observación es de una ejecución anterior',
  })
  async revisar(
    @Param() { observacionId }: ObservacionParamsDto,
    @Body() dto: RevisarObservacionDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<ObservacionResponseDto> {
    const observacion = await this.revisarObservacionUseCase.execute(
      observacionId,
      dto,
      { usuarioId: usuario.id, roles: usuario.roles },
    );
    return aObservacionResponse(observacion);
  }
}
