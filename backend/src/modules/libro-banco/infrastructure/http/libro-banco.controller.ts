import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LibroBancoParamsDto } from './dto/libro-banco-params.dto.js';
import { UploadLibroBancoDto } from './dto/upload-libro-banco.dto.js';
import { IngestarLibroBancoUseCase } from '../../application/use-cases/ingestar-libro-banco.use-case.js';

@ApiTags('Libro Banco')
@Controller('cuentas-mensuales/:cuentaMensualId/libro-banco')
export class LibroBancoController {
  constructor(
    private readonly ingestarLibroBancoUseCase: IngestarLibroBancoUseCase,
  ) {}

  @Post('ingestar')
  @HttpCode(HttpStatus.CREATED)
  //documentación para swagger
  @ApiOperation({ summary: 'Ingestar y persistir las transacciones del Libro Banco' })
  @ApiResponse({ status: 201, description: 'Libro Banco e historia de transacciones persistidas' })
  @ApiResponse({ status: 400, description: 'Error de validación de campos' })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual especificada no existe' })
  async ingestar(
    @Param() { cuentaMensualId }: LibroBancoParamsDto,
    @Body() dto: UploadLibroBancoDto,
  ) {
    return await this.ingestarLibroBancoUseCase.execute(cuentaMensualId, dto);
  }
}