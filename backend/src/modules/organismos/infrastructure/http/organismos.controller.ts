import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
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
import { AsignarAuditorDto } from './dto/asignar-auditor.dto.js';
import { AuditorResponseDto } from './dto/auditor-response.dto.js';
import { CrearOrganismoDto } from './dto/crear-organismo.dto.js';
import { OrganismoParamsDto } from './dto/organismo-params.dto.js';
import { OrganismoConAuditorResponseDto } from './dto/organismo-response.dto.js';
import { CrearOrganismoUseCase } from '../../application/use-cases/crear-organismo.use-case.js';
import { AsignarAuditorUseCase } from '../../application/use-cases/asignar-auditor.use-case.js';
import { ListarAuditoresUseCase } from '../../application/use-cases/listar-auditores.use-case.js';
import { QuitarAuditorUseCase } from '../../application/use-cases/quitar-auditor.use-case.js';
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
    private readonly asignarAuditorUseCase: AsignarAuditorUseCase,
    private readonly quitarAuditorUseCase: QuitarAuditorUseCase,
    private readonly listarAuditoresUseCase: ListarAuditoresUseCase,
  ) {}

  private toResponse(organismo: Organismo): OrganismoConAuditorResponseDto {
    return {
      id: organismo.id!,
      nombre: organismo.nombre,
      rubro: organismo.rubro,
      active: organismo.active,
      fechaCreacion: organismo.fechaCreacion!.toISOString(),
      auditorId: organismo.auditorId,
      auditor: organismo.auditor,
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
    type: [OrganismoConAuditorResponseDto],
  })
  async listar(): Promise<OrganismoConAuditorResponseDto[]> {
    const organismos = await this.listarOrganismosUseCase.execute();
    return organismos.map((organismo) => this.toResponse(organismo));
  }

  //va antes de las rutas con :organismoId
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.JUEZ_TRAMITE)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({ description: 'Requiere el rol ADMIN o JUEZ_TRAMITE' })
  @Get('auditores')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar los auditores que se pueden asignar a un organismo',
    description: 'Usuarios activos con el rol AUDITOR.',
  })
  @ApiResponse({ status: 200, type: [AuditorResponseDto] })
  async listarAuditores(): Promise<AuditorResponseDto[]> {
    const auditores = await this.listarAuditoresUseCase.execute();
    return auditores.map((auditor) => ({
      id: auditor.id!,
      nombre: auditor.nombre,
      apellido: auditor.apellido,
      email: auditor.email,
    }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.JUEZ_TRAMITE)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({ description: 'Requiere el rol ADMIN o JUEZ_TRAMITE' })
  @Registrar(AccionActividad.AUDITOR_ASIGNADO, {
    entidad: TipoEntidadActividad.ORGANISMO,
    idParam: 'organismoId',
    organismoParam: 'organismoId',
  })
  @Put(':organismoId/auditor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Asignar el auditor que fiscaliza las rendiciones del organismo',
    description:
      'Un organismo tiene un solo auditor a la vez: si ya tenía otro, lo reemplaza (el cambio queda en la bitácora).',
  })
  @ApiResponse({ status: 200, type: OrganismoConAuditorResponseDto })
  @ApiResponse({
    status: 404,
    description: 'El organismo o el usuario no existen',
  })
  @ApiResponse({
    status: 409,
    description:
      'El organismo está inactivo, o el usuario no está activo o no tiene el rol AUDITOR',
  })
  async asignarAuditor(
    @Param() { organismoId }: OrganismoParamsDto,
    @Body() { auditorId }: AsignarAuditorDto,
  ): Promise<OrganismoConAuditorResponseDto> {
    const organismo = await this.asignarAuditorUseCase.execute(
      organismoId,
      auditorId,
    );
    return this.toResponse(organismo);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN, Rol.JUEZ_TRAMITE)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({ description: 'Requiere el rol ADMIN o JUEZ_TRAMITE' })
  @Registrar(AccionActividad.AUDITOR_QUITADO, {
    entidad: TipoEntidadActividad.ORGANISMO,
    idParam: 'organismoId',
    organismoParam: 'organismoId',
  })
  @Delete(':organismoId/auditor')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar el auditor asignado al organismo' })
  @ApiResponse({ status: 200, type: OrganismoConAuditorResponseDto })
  @ApiResponse({ status: 404, description: 'El organismo no existe' })
  @ApiResponse({ status: 409, description: 'El organismo no tiene auditor' })
  async quitarAuditor(
    @Param() { organismoId }: OrganismoParamsDto,
  ): Promise<OrganismoConAuditorResponseDto> {
    return this.toResponse(
      await this.quitarAuditorUseCase.execute(organismoId),
    );
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
    type: OrganismoConAuditorResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async crear(
    @Body() dto: CrearOrganismoDto,
  ): Promise<OrganismoConAuditorResponseDto> {
    const organismo = await this.crearOrganismoUseCase.execute(
      dto.nombre,
      dto.rubro,
    );
    return this.toResponse(organismo);
  }
}
