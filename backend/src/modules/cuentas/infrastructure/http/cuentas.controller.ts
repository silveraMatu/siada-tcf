import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResolverCuentaMensualDto } from './dto/resolver-cuenta-mensual.dto.js';
import { CuentaMensualResponseDto } from './dto/cuenta-mensual-response.dto.js';
import { ResolverCuentaMensualUseCase } from '../../application/use-cases/resolver-cuenta-mensual.use-case.js';
import type { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';

@ApiTags('Cuentas')
@Controller('cuentas-mensuales')
export class CuentasController {
  constructor(
    private readonly resolverCuentaMensualUseCase: ResolverCuentaMensualUseCase,
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
}
