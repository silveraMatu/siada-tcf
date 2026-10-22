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
import { CuentaMensualResponseDto } from './dto/cuenta-mensual-response.dto.js';
import { CuentaMensualParamsDto } from './dto/cuenta-mensual-params.dto.js';
import { ListarCuentasMensualesQueryDto } from './dto/listar-cuentas-mensuales-query.dto.js';
import { ResolverCuentaMensualUseCase } from '../../application/use-cases/resolver-cuenta-mensual.use-case.js';
import { PresentarCuentaMensualUseCase } from '../../application/use-cases/presentar-cuenta-mensual.use-case.js';
import { ListarCuentasMensualesUseCase } from '../../application/use-cases/listar-cuentas-mensuales.use-case.js';
import type { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';

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
    };
  }

  @Post('resolver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtiene o genera idempotentemente el ID de la Cuenta Mensual',
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
  ): Promise<CuentaMensualResponseDto> {
    const cuentaMensual = await this.resolverCuentaMensualUseCase.execute(
      dto.organismoId,
      dto.ejercicioFiscal,
      dto.mes,
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
      'Pensado para el Auditor: ?estado=LISTO_PARA_AUDITAR trae solo las cuentas ya presentadas. Ordenadas por id.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuentas recuperadas (lista vacía si ninguna coincide)',
    type: [CuentaMensualResponseDto],
  })
  @ApiResponse({ status: 400, description: 'El estado no es válido' })
  async listar(
    @Query() { estado }: ListarCuentasMensualesQueryDto,
  ): Promise<CuentaMensualResponseDto[]> {
    const cuentas = await this.listarCuentasMensualesUseCase.execute({
      estado,
    });
    return cuentas.map((cuenta) => this.toResponse(cuenta));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.RESPONSABLE)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
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
  @ApiResponse({ status: 409, description: 'La cuenta ya fue presentada' })
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
