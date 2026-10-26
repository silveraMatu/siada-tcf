import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import { ResolverCuentaMensualDto } from './dto/resolver-cuenta-mensual.dto.js';
import {
  CuentaMensualListadaResponseDto,
  CuentaMensualResponseDto,
} from './dto/cuenta-mensual-response.dto.js';
import { CuentaMensualParamsDto } from './dto/cuenta-mensual-params.dto.js';
import { ListarCuentasMensualesQueryDto } from './dto/listar-cuentas-mensuales-query.dto.js';
import { ResolverCuentaMensualUseCase } from '../../application/use-cases/resolver-cuenta-mensual.use-case.js';
import { PresentarCuentaMensualUseCase } from '../../application/use-cases/presentar-cuenta-mensual.use-case.js';
import { ListarCuentasMensualesUseCase } from '../../application/use-cases/listar-cuentas-mensuales.use-case.js';
import type { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';

@ApiTags('Cuentas')
@Controller('cuentas-mensuales')
export class CuentasController {
  constructor(
    private readonly resolverCuentaMensualUseCase: ResolverCuentaMensualUseCase,
    private readonly presentarCuentaMensualUseCase: PresentarCuentaMensualUseCase,
    private readonly listarCuentasMensualesUseCase: ListarCuentasMensualesUseCase,
  ) {}

  private toResponse(cuentaMensual: CuentaMensual): CuentaMensualResponseDto {
    return {
      id: cuentaMensual.id!,
      mes: cuentaMensual.mes,
      cuentaAnualId: cuentaMensual.cuentaAnualId,
      estado: cuentaMensual.estado,
      fechaCreacion: cuentaMensual.fechaCreacion!.toISOString(),
      presentadaPorId: cuentaMensual.presentadaPorId ?? null,
      presentadaEn: cuentaMensual.presentadaEn?.toISOString() ?? null,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.RESPONSABLE, Rol.ADMIN)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({
    description: 'Requiere el rol RESPONSABLE (solo de su organismo) o ADMIN',
  })
  @Registrar(AccionActividad.CUENTA_RESUELTA, {
    entidad: TipoEntidadActividad.CUENTA_MENSUAL,
    idRespuesta: 'id',
  })
  @Post('resolver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtiene o genera idempotentemente el ID de la Cuenta Mensual',
    description:
      'Un RESPONSABLE solo puede resolver cuentas de su propio organismo; un ADMIN, de cualquiera.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta Mensual resuelta exitosamente',
    type: CuentaMensualResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({
    status: 404,
    description: 'El Organismo especificado no existe',
  })
  @ApiResponse({
    status: 409,
    description: 'El Organismo especificado no está activo',
  })
  async resolver(
    @Body() dto: ResolverCuentaMensualDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<CuentaMensualResponseDto> {
    const cuentaMensual = await this.resolverCuentaMensualUseCase.execute(
      dto.organismoId,
      dto.ejercicioFiscal,
      dto.mes,
      {
        usuarioId: usuario.id,
        esAdmin: usuario.roles.includes(Rol.ADMIN),
      },
    );
    return this.toResponse(cuentaMensual);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.AUDITOR)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({ description: 'Requiere el rol ADMIN o AUDITOR' })
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar cuentas mensuales, opcionalmente filtradas por estado',
    description:
      'Pensado para el Auditor: ?estado=LISTO_PARA_AUDITAR trae solo las cuentas ya presentadas, y un AUDITOR solo ve las de los organismos que tiene asignados (un ADMIN ve todas). Ordenadas por id. Cada cuenta incluye un resumen de sus libros (tipo LIBRO_BANCO o INGRESOS_EGRESOS, N° de cuenta corriente, cantidad de transacciones y fechas extremas), sin las transacciones: primero los libros banco y después el de ingresos y egresos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuentas recuperadas (lista vacía si ninguna coincide)',
    type: [CuentaMensualListadaResponseDto],
  })
  @ApiResponse({ status: 400, description: 'El estado no es válido' })
  async listar(
    @Query() { estado }: ListarCuentasMensualesQueryDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<CuentaMensualListadaResponseDto[]> {
    //un AUDITOR solo ve las cuentas de los organismos que tiene asignados
    const cuentas = await this.listarCuentasMensualesUseCase.execute(
      { estado },
      { usuarioId: usuario.id, roles: usuario.roles },
    );
    return cuentas.map((cuenta) => ({
      id: cuenta.id,
      mes: cuenta.mes,
      cuentaAnualId: cuenta.cuentaAnualId,
      estado: cuenta.estado,
      fechaCreacion: cuenta.fechaCreacion.toISOString(),
      presentadaPorId: cuenta.presentadaPorId,
      presentadaEn: cuenta.presentadaEn?.toISOString() ?? null,
      organismoId: cuenta.organismoId,
      organismoNombre: cuenta.organismoNombre,
      ejercicioFiscal: cuenta.ejercicioFiscal,
      libros: cuenta.libros.map((libro) => ({
        id: libro.id,
        tipo: libro.tipo,
        numeroCuentaCte: libro.numeroCuentaCte,
        cantidadTransacciones: libro.cantidadTransacciones,
        fechaDesde: libro.fechaDesde,
        fechaHasta: libro.fechaHasta,
      })),
    }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.RESPONSABLE)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @Registrar(AccionActividad.CUENTA_PRESENTADA, {
    entidad: TipoEntidadActividad.CUENTA_MENSUAL,
    idParam: 'id',
    cuentaParam: 'id',
  })
  @Patch(':id/presentar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Enviar la Cuenta Mensual a auditoría (EN_BORRADOR → LISTO_PARA_AUDITAR)',
    description:
      'Solo el responsable del organismo de la cuenta. Desde ahí no se pueden subir ni modificar libros.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta presentada',
    type: CuentaMensualResponseDto,
  })
  @ApiResponse({ status: 400, description: 'ID de cuenta mensual inválido' })
  @ApiResponse({
    status: 403,
    description:
      'Falta el rol RESPONSABLE o la cuenta no pertenece al organismo del responsable',
  })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  @ApiResponse({
    status: 409,
    description: 'La cuenta ya fue presentada o no tiene ningún libro cargado',
  })
  async presentar(
    @Param() { id }: CuentaMensualParamsDto,
    @UsuarioActual() usuario: UsuarioAutenticado,
  ): Promise<CuentaMensualResponseDto> {
    const cuentaMensual = await this.presentarCuentaMensualUseCase.execute(
      id,
      usuario.id,
    );
    return this.toResponse(cuentaMensual);
  }
}
