import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CrearOrganismoDto } from './dto/crear-organismo.dto.js';
import { OrganismoResponseDto } from './dto/organismo-response.dto.js';
import { CrearOrganismoUseCase } from '../../application/use-cases/crear-organismo.use-case.js';
import { ListarOrganismosUseCase } from '../../application/use-cases/listar-organismos.use-case.js';
import type { Organismo } from '../../domain/entities/organismo.domain.js';

@ApiTags('Organismos')
@Controller('organismos')
export class OrganismosController {
  constructor(
    private readonly crearOrganismoUseCase: CrearOrganismoUseCase,
    private readonly listarOrganismosUseCase: ListarOrganismosUseCase,
  ) {}

  private toResponse(organismo: Organismo): OrganismoResponseDto {
    return {
      id: organismo.id!,
      nombre: organismo.nombre,
      rubro: organismo.rubro,
      active: organismo.active,
      fechaCreacion: organismo.fechaCreacion!.toISOString(),
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar todos los organismos registrados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de organismos recuperada',
    type: [OrganismoResponseDto],
  })
  async listar(): Promise<OrganismoResponseDto[]> {
    const organismos = await this.listarOrganismosUseCase.execute();
    return organismos.map((organismo) => this.toResponse(organismo));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un nuevo organismo' })
  @ApiResponse({
    status: 201,
    description: 'Organismo creado exitosamente',
    type: OrganismoResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async crear(@Body() dto: CrearOrganismoDto): Promise<OrganismoResponseDto> {
    const organismo = await this.crearOrganismoUseCase.execute(
      dto.nombre,
      dto.rubro,
    );
    return this.toResponse(organismo);
  }
}
