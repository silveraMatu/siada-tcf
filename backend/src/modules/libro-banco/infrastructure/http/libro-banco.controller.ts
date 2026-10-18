import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LibroBancoParamsDto } from './dto/libro-banco-params.dto.js';
import { UploadLibroBancoDto } from './dto/upload-libro-banco.dto.js';
import { LibroBancoResponseDto } from './dto/libro-banco-response.dto.js';
import { IngestarLibroBancoUseCase } from '../../application/use-cases/ingestar-libro-banco.use-case.js';
import { ObtenerLibroBancoUseCase } from '../../application/use-cases/obtener-libro-banco.use-case.js';
import type { LibroBanco } from '../../domain/entities/libro-banco.domain.js';

@ApiTags('Libro Banco')
@Controller('cuentas-mensuales/:cuentaMensualId/libro-banco')
export class LibroBancoController {
  constructor(
    private readonly ingestarLibroBancoUseCase: IngestarLibroBancoUseCase,
    private readonly obtenerLibroBancoUseCase: ObtenerLibroBancoUseCase,
  ) {}

  private toResponse(libro: LibroBanco): LibroBancoResponseDto {
    return {
      id: libro.id!,
      cuentaMensualId: libro.cuentaMensualId,
      numeroCuentaCte: libro.numeroCuentaCte,
      fechaCreacion: libro.fechaCreacion!.toISOString(),
      transacciones: libro.transacciones.map((t) => ({
        id: t.id!,
        fecha: t.fecha,
        cheque: t.cheque,
        aLaOrdenDe: t.aLaOrdenDe,
        depositos: t.depositos,
        retiro: t.retiro,
        saldo: t.saldo,
      })),
    };
  }

  @Post('ingestar')
  @HttpCode(HttpStatus.CREATED)
  //documentación para swagger
  @ApiOperation({
    summary: 'Ingestar y persistir las transacciones del Libro Banco',
  })
  @ApiResponse({
    status: 201,
    description: 'Libro Banco e historia de transacciones persistidas',
    type: LibroBancoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Error de validación de campos' })
  @ApiResponse({
    status: 404,
    description: 'La Cuenta Mensual especificada no existe',
  })
  async ingestar(
    @Param() { cuentaMensualId }: LibroBancoParamsDto,
    @Body() dto: UploadLibroBancoDto,
  ): Promise<LibroBancoResponseDto> {
    const libro = await this.ingestarLibroBancoUseCase.execute(
      cuentaMensualId,
      dto,
    );
    return this.toResponse(libro);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Obtener los Libros Banco (uno por cuenta bancaria) y sus transacciones por ID de Cuenta Mensual',
  })
  @ApiResponse({
    status: 200,
    description:
      'Libros Banco recuperados exitosamente (lista vacía si no hay ninguno cargado)',
    type: [LibroBancoResponseDto],
  })
  @ApiResponse({ status: 404, description: 'La Cuenta Mensual no existe' })
  async obtenerPorCuentaMensual(
    @Param() { cuentaMensualId }: LibroBancoParamsDto,
  ): Promise<LibroBancoResponseDto[]> {
    const libros = await this.obtenerLibroBancoUseCase.execute(cuentaMensualId);
    return libros.map((libro) => this.toResponse(libro));
  }
}
