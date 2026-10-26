import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { CrearOrganismoDto } from './dto/crear-organismo.dto.js';
import { OrganismoResponseDto } from './dto/organismo-response.dto.js';
import { CrearOrganismoUseCase } from '../../application/use-cases/crear-organismo.use-case.js';
import { ListarOrganismosUseCase } from '../../application/use-cases/listar-organismos.use-case.js';
import type { Organismo } from '../../domain/entities/organismo.domain.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.JUEZ_TRAMITE)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({ description: 'Requiere el rol ADMIN o JUEZ_TRAMITE' })
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({ description: 'Requiere el rol ADMIN' })
  @Registrar(AccionActividad.ORGANISMO_CREADO, {
    entidad: TipoEntidadActividad.ORGANISMO,
    idRespuesta: 'id',
  })
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
