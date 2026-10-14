import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LibroBancoParamsDto } from './dto/libro-banco-params.dto.js';
import { UploadLibroBancoDto } from './dto/upload-libro-banco.dto.js';
import { IngestarLibroBancoUseCase } from '../../application/use-cases/ingestar-libro-banco.use-case.js';
import { ObtenerLibroBancoUseCase } from '../../application/use-cases/obtener-libro-banco.use-case.js';

@ApiTags('Libro Banco')
@Controller('cuentas-mensuales/:cuentaMensualId/libro-banco')
export class LibroBancoController {
  constructor(
    private readonly ingestarLibroBancoUseCase: IngestarLibroBancoUseCase,
    private readonly obtenerLibroBancoUseCase: ObtenerLibroBancoUseCase,
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

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener los Libros Banco (uno por cuenta bancaria) y sus transacciones por ID de Cuenta Mensual' })
  @ApiResponse({ status: 200, description: 'Libros Banco recuperados exitosamente (lista vacía si no hay ninguno cargado)' })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  async obtenerPorCuentaMensual(
    @Param() { cuentaMensualId }: LibroBancoParamsDto,
  ) {
    return await this.obtenerLibroBancoUseCase.execute(cuentaMensualId);
  }
}