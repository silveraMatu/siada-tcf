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
import { IngestarRaiUseCase } from '../../application/use-cases/ingestar-rai.use-case.js';
import { ObtenerRaiUseCase } from '../../application/use-cases/obtener-rai.use-case.js';
import type { Rai } from '../../domain/entities/rai.domain.js';
import { IngestarRaiDto } from './dto/ingestar-rai.dto.js';
import { RaiParamsDto } from './dto/rai-params.dto.js';
import { RaiResponseDto } from './dto/rai-response.dto.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';

@ApiTags('RAI')
@Controller('cuentas-mensuales/:cuentaMensualId/rai')
export class RaiController {
  constructor(
    private readonly ingestarRaiUseCase: IngestarRaiUseCase,
    private readonly obtenerRaiUseCase: ObtenerRaiUseCase,
  ) {}

  private toResponse(libro: Rai): RaiResponseDto {
    return {
      id: libro.id!,
      cuentaMensualId: libro.cuentaMensualId,
      fechaCreacion: libro.fechaCreacion!.toISOString(),
      subidoPorId: libro.subidoPorId!,
      subidoPor: libro.subidoPor ?? null,
      hashContenido: libro.hashContenido!,
      transacciones: libro.transacciones.map((t) => ({
        id: t.id!,
        asiento: t.asiento,
        fecha: t.fecha,
        planillaNumero: t.planillaNumero,
        concepto: t.concepto,
        ingresosDiarios: t.ingresosDiarios,
        ingresosMensuales: t.ingresosMensuales,
        ingresosAcumulados: t.ingresosAcumulados,
        saldo: t.saldo,
      })),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.RESPONSABLE)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({
    description:
      'Requiere el rol RESPONSABLE y que la cuenta sea de su organismo',
  })
  @Registrar(AccionActividad.RAI_CARGADO, {
    entidad: TipoEntidadActividad.CUENTA_MENSUAL,
    idParam: 'cuentaMensualId',
    cuentaParam: 'cuentaMensualId',
  })
  @Post('ingestar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ingestar y persistir el libro RAI',
    description:
      'Solo puede haber un libro RAI (Registro Analítico de Ingresos) por rendición mensual, con los asientos de ingresos del mes. Es opcional para presentar la rendición. Si ya existe responde 409 (codigo LIBRO_DUPLICADO) salvo que se envíe reemplazar=true.',
  })
  @ApiResponse({
    status: 201,
    description: 'Libro RAI y sus asientos persistidos',
    type: RaiResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Error de validación de campos' })
  @ApiResponse({
    status: 404,
    description: 'La Cuenta Mensual especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description:
      'La cuenta ya fue enviada a auditoría, o ya hay un libro RAI (codigo LIBRO_DUPLICADO)',
  })
  async ingestar(
    @Param() { cuentaMensualId }: RaiParamsDto,
    @Body() dto: IngestarRaiDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<RaiResponseDto> {
    const libro = await this.ingestarRaiUseCase.execute(
      cuentaMensualId,
      dto,
      usuario.id,
    );
    return this.toResponse(libro);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.RESPONSABLE, Rol.ADMIN, Rol.AUDITOR)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({
    description:
      'Requiere el rol RESPONSABLE (solo de su organismo), ADMIN o AUDITOR',
  })
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtener el libro RAI y sus asientos por ID de Cuenta Mensual',
  })
  @ApiResponse({
    status: 200,
    description: 'Libro recuperado exitosamente',
    type: RaiResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'La Cuenta Mensual no existe o no tiene un libro RAI cargado',
  })
  async obtenerPorCuentaMensual(
    @Param() { cuentaMensualId }: RaiParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<RaiResponseDto> {
    //ADMIN ve todo; un AUDITOR, los organismos que tiene asignados; un RESPONSABLE, el suyo
    const libro = await this.obtenerRaiUseCase.execute(cuentaMensualId, {
      usuarioId: usuario.id,
      roles: usuario.roles,
    });
    return this.toResponse(libro);
  }
}
