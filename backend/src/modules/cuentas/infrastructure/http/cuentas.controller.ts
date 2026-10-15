import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResolverCuentaMensualDto } from './dto/resolver-cuenta-mensual.dto.js';
import { ResolverCuentaMensualUseCase } from '../../application/use-cases/resolver-cuenta-mensual.use-case.js';

@ApiTags('Cuentas')
@Controller('cuentas-mensuales')
export class CuentasController {
  constructor(
    private readonly resolverCuentaMensualUseCase: ResolverCuentaMensualUseCase,
  ) {}

  @Post('resolver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtiene o genera idempotentemente el ID de la Cuenta Mensual',
  })
  @ApiResponse({
    status: 200,
    description: 'Cuenta Mensual resuelta exitosamente',
  })
  async resolver(@Body() dto: ResolverCuentaMensualDto) {
    return await this.resolverCuentaMensualUseCase.execute(
      dto.organismoId,
      dto.ejercicioFiscal,
      dto.mes,
    );
  }
}