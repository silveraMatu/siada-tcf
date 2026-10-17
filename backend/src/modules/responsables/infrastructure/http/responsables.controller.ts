import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CrearResponsableDto } from './dto/crear-responsable.dto.js';
import { ResponsableParamsDto } from './dto/responsable-params.dto.js';
import { ResponsableResponseDto } from './dto/responsable-response.dto.js';
import { CrearResponsableUseCase } from '../../application/use-cases/crear-responsable.use-case.js';
import { ObtenerResponsablesPorOrganismoUseCase } from '../../application/use-cases/obtener-responsables-por-organismo.use-case.js';
import type { Responsable } from '../../domain/entities/responsable.domain.js';

@ApiTags('Responsables')
@Controller()
export class ResponsablesController {
  constructor(
    private readonly crearResponsableUseCase: CrearResponsableUseCase,
    private readonly obtenerResponsablesPorOrganismoUseCase: ObtenerResponsablesPorOrganismoUseCase,
  ) {}

  private toResponse(responsable: Responsable): ResponsableResponseDto {
    return {
      id: responsable.id!,
      nombre: responsable.nombre,
      apellido: responsable.apellido,
      email: responsable.email,
      activo: responsable.activo,
      organismoId: responsable.organismoId,
      fechaCreacion: responsable.fechaCreacion!.toISOString(),
    };
  }

  @Post('responsables')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un responsable de rendiciones (nace sin organismo asignado)' })
  @ApiResponse({ status: 201, description: 'Responsable creado exitosamente', type: ResponsableResponseDto })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async crear(@Body() dto: CrearResponsableDto): Promise<ResponsableResponseDto> {
    const responsable = await this.crearResponsableUseCase.execute(
      dto.nombre,
      dto.apellido,
      dto.email,
    );
    return this.toResponse(responsable);
  }

  @Get('organismos/:organismoId/responsables')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar los responsables de un organismo' })
  @ApiResponse({
    status: 200,
    description: 'Responsables recuperados exitosamente (lista vacía si no hay ninguno)',
    type: [ResponsableResponseDto],
  })
  @ApiResponse({ status: 404, description: 'El Organismo especificado no existe' })
  async obtenerPorOrganismo(
    @Param() { organismoId }: ResponsableParamsDto,
  ): Promise<ResponsableResponseDto[]> {
    const responsables = await this.obtenerResponsablesPorOrganismoUseCase.execute(organismoId);
    return responsables.map((responsable) => this.toResponse(responsable));
  }
}
