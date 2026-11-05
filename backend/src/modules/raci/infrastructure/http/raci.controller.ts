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
import { IngestarRaciUseCase } from '../../application/use-cases/ingestar-raci.use-case.js';
import { ObtenerRaciUseCase } from '../../application/use-cases/obtener-raci.use-case.js';
import type { Raci } from '../../domain/entities/raci.domain.js';
import { IngestarRaciDto } from './dto/ingestar-raci.dto.js';
import { RaciParamsDto } from './dto/raci-params.dto.js';
import { RaciResponseDto } from './dto/raci-response.dto.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';

@ApiTags('RACI')
@Controller('cuentas-mensuales/:cuentaMensualId/raci')
export class RaciController {
  constructor(
    private readonly ingestarRaciUseCase: IngestarRaciUseCase,
    private readonly obtenerRaciUseCase: ObtenerRaciUseCase,
  ) {}

  private toResponse(libro: Raci): RaciResponseDto {
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
        expediente: t.expediente,
        concepto: t.concepto,
        compromisoInstrumentoLegal: t.compromisoInstrumentoLegal,
        compromisoDelMes: t.compromisoDelMes,
        compromisoAcumulado: t.compromisoAcumulado,
        compromisoOrdenProvision: t.compromisoOrdenProvision,
        devengadoDelMes: t.devengadoDelMes,
        devengadoAcumulado: t.devengadoAcumulado,
        devengadoSaldo: t.devengadoSaldo,
        devengadoOrdenPago: t.devengadoOrdenPago,
        pagoNumeroCheque: t.pagoNumeroCheque,
        pagoDelMes: t.pagoDelMes,
        pagoAcumulado: t.pagoAcumulado,
        pagoSaldoAPagar: t.pagoSaldoAPagar,
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
  @Registrar(AccionActividad.RACI_CARGADO, {
    entidad: TipoEntidadActividad.CUENTA_MENSUAL,
    idParam: 'cuentaMensualId',
    cuentaParam: 'cuentaMensualId',
  })
  @Post('ingestar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ingestar y persistir el libro RACI',
    description:
      'Solo puede haber un libro RACI por rendición mensual (los asientos del mes). Es opcional para presentar la rendición. Si ya existe responde 409 (codigo LIBRO_DUPLICADO) salvo que se envíe reemplazar=true.',
  })
  @ApiResponse({
    status: 201,
    description: 'Libro RACI y sus asientos persistidos',
    type: RaciResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Error de validación de campos' })
  @ApiResponse({
    status: 404,
    description: 'La Cuenta Mensual especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description:
      'La cuenta ya fue enviada a auditoría, o ya hay un libro RACI (codigo LIBRO_DUPLICADO)',
  })
  async ingestar(
    @Param() { cuentaMensualId }: RaciParamsDto,
    @Body() dto: IngestarRaciDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<RaciResponseDto> {
    const libro = await this.ingestarRaciUseCase.execute(
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
    summary: 'Obtener el libro RACI y sus asientos por ID de Cuenta Mensual',
  })
  @ApiResponse({
    status: 200,
    description: 'Libro recuperado exitosamente',
    type: RaciResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'La Cuenta Mensual no existe o no tiene un libro RACI cargado',
  })
  async obtenerPorCuentaMensual(
    @Param() { cuentaMensualId }: RaciParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<RaciResponseDto> {
    //ADMIN ve todo; un AUDITOR, los organismos que tiene asignados; un RESPONSABLE, el suyo
    const libro = await this.obtenerRaciUseCase.execute(cuentaMensualId, {
      usuarioId: usuario.id,
      roles: usuario.roles,
    });
    return this.toResponse(libro);
  }
}
