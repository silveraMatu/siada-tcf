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
import { IngestarIngresosEgresosUseCase } from '../../application/use-cases/ingestar-ingresos-egresos.use-case.js';
import { ObtenerIngresosEgresosUseCase } from '../../application/use-cases/obtener-ingresos-egresos.use-case.js';
import type { IngresosEgresos } from '../../domain/entities/ingresos-egresos.domain.js';
import { IngestarIngresosEgresosDto } from './dto/ingestar-ingresos-egresos.dto.js';
import { IngresosEgresosParamsDto } from './dto/ingresos-egresos-params.dto.js';
import { IngresosEgresosResponseDto } from './dto/ingresos-egresos-response.dto.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';

@ApiTags('Ingresos y Egresos')
@Controller('cuentas-mensuales/:cuentaMensualId/ingresos-egresos')
export class IngresosEgresosController {
  constructor(
    private readonly ingestarIngresosEgresosUseCase: IngestarIngresosEgresosUseCase,
    private readonly obtenerIngresosEgresosUseCase: ObtenerIngresosEgresosUseCase,
  ) {}

  private toResponse(libro: IngresosEgresos): IngresosEgresosResponseDto {
    return {
      id: libro.id!,
      cuentaMensualId: libro.cuentaMensualId,
      numeroCuentaCte: libro.numeroCuentaCte,
      fechaCreacion: libro.fechaCreacion!.toISOString(),
      subidoPorId: libro.subidoPorId!,
      hashContenido: libro.hashContenido!,
      transacciones: libro.transacciones.map((t) => ({
        id: t.id!,
        fila: t.fila,
        fecha: t.fecha,
        concepto: t.concepto,
        cheque: t.cheque,
        comprobante: t.comprobante,
        cajaDebe: t.cajaDebe,
        cajaHaber: t.cajaHaber,
        cajaSaldo: t.cajaSaldo,
        bancoDebe: t.bancoDebe,
        bancoHaber: t.bancoHaber,
        bancoSaldo: t.bancoSaldo,
        egresoInc1: t.egresoInc1,
        egresoInc2: t.egresoInc2,
        egresoInc3: t.egresoInc3,
        egresoInc4: t.egresoInc4,
        egresoInc5: t.egresoInc5,
        ingresoMunicipal: t.ingresoMunicipal,
        ingresoOtras: t.ingresoOtras,
        cuentasVariasConcepto: t.cuentasVariasConcepto,
        cuentasVariasDebe: t.cuentasVariasDebe,
        cuentasVariasHaber: t.cuentasVariasHaber,
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
  @Registrar(AccionActividad.INGRESOS_EGRESOS_CARGADO, {
    entidad: TipoEntidadActividad.CUENTA_MENSUAL,
    idParam: 'cuentaMensualId',
    cuentaParam: 'cuentaMensualId',
  })
  @Post('ingestar')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Ingestar y persistir el libro de Ingresos y Egresos',
    description:
      'Solo puede haber un libro de ingresos y egresos por rendición mensual. Si ya existe responde 409 (codigo LIBRO_DUPLICADO) salvo que se envíe reemplazar=true.',
  })
  @ApiResponse({
    status: 201,
    description: 'Libro de Ingresos y Egresos y sus transacciones persistidas',
    type: IngresosEgresosResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Error de validación de campos' })
  @ApiResponse({
    status: 404,
    description: 'La Cuenta Mensual especificada no existe',
  })
  @ApiResponse({
    status: 409,
    description:
      'La cuenta ya fue enviada a auditoría, o ya hay un libro de ingresos y egresos (codigo LIBRO_DUPLICADO)',
  })
  async ingestar(
    @Param() { cuentaMensualId }: IngresosEgresosParamsDto,
    @Body() dto: IngestarIngresosEgresosDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<IngresosEgresosResponseDto> {
    const libro = await this.ingestarIngresosEgresosUseCase.execute(
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
    summary:
      'Obtener el libro de Ingresos y Egresos y sus transacciones por ID de Cuenta Mensual',
  })
  @ApiResponse({
    status: 200,
    description: 'Libro recuperado exitosamente',
    type: IngresosEgresosResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'La Cuenta Mensual no existe o no tiene un libro de ingresos y egresos cargado',
  })
  async obtenerPorCuentaMensual(
    @Param() { cuentaMensualId }: IngresosEgresosParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<IngresosEgresosResponseDto> {
    //ADMIN ve todo; un AUDITOR, los organismos que tiene asignados; un RESPONSABLE, el suyo
    const libro = await this.obtenerIngresosEgresosUseCase.execute(
      cuentaMensualId,
      { usuarioId: usuario.id, roles: usuario.roles },
    );
    return this.toResponse(libro);
  }
}
