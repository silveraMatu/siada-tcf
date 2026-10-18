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
import { Rol } from '../../../usuarios/domain/enums/rol.enum.js';
import { CrearResponsableDto } from './dto/crear-responsable.dto.js';
import { AsignarOrganismoDto } from './dto/asignar-organismo.dto.js';
import { ResponsableIdParamsDto } from './dto/responsable-id-params.dto.js';
import { ResponsableParamsDto } from './dto/responsable-params.dto.js';
import { ResponsableResponseDto } from './dto/responsable-response.dto.js';
import { ResponsableConUsuarioResponseDto } from './dto/responsable-con-usuario-response.dto.js';
import { ListarResponsablesQueryDto } from './dto/listar-responsables-query.dto.js';
import { CrearResponsableUseCase } from '../../application/use-cases/crear-responsable.use-case.js';
import { AsignarOrganismoAResponsableUseCase } from '../../application/use-cases/asignar-organismo.use-case.js';
import { ListarResponsablesUseCase } from '../../application/use-cases/listar-responsables.use-case.js';
import { ObtenerResponsablesPorOrganismoUseCase } from '../../application/use-cases/obtener-responsables-por-organismo.use-case.js';
import type { Responsable } from '../../domain/entities/responsable.domain.js';

@ApiTags('Responsables')
@Controller()
export class ResponsablesController {
  constructor(
    private readonly crearResponsableUseCase: CrearResponsableUseCase,
    private readonly listarResponsablesUseCase: ListarResponsablesUseCase,
    private readonly obtenerResponsablesPorOrganismoUseCase: ObtenerResponsablesPorOrganismoUseCase,
    private readonly asignarOrganismoAResponsableUseCase: AsignarOrganismoAResponsableUseCase,
  ) {}

  private toResponse(responsable: Responsable): ResponsableResponseDto {
    return {
      id: responsable.id!,
      usuarioId: responsable.usuarioId,
      active: responsable.active,
      organismoId: responsable.organismoId,
      fechaCreacion: responsable.fechaCreacion!.toISOString(),
    };
  }

  private toResponseConUsuario(
    responsable: Responsable,
  ): ResponsableConUsuarioResponseDto {
    const { id, usuarioId, active, organismoId, fechaCreacion } =
      this.toResponse(responsable);
    return {
      id,
      usuarioId,
      active,
      organismoId,
      fechaCreacion,
      usuario: responsable.usuario!,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({ description: 'Requiere el rol ADMIN' })
  @Get('responsables')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Endpoint administrativo para listar los responsables con los datos de su usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Responsables recuperados (lista vacía si no hay ninguno)',
    type: [ResponsableConUsuarioResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'El filtro sinOrganismo debe ser true o false',
  })
  async listar(
    @Query() { sinOrganismo }: ListarResponsablesQueryDto,
  ): Promise<ResponsableConUsuarioResponseDto[]> {
    const responsables = await this.listarResponsablesUseCase.execute({
      sinOrganismo,
    });
    return responsables.map((responsable) =>
      this.toResponseConUsuario(responsable),
    );
  }

  @Post('responsables')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Registrar un responsable de rendiciones a partir de un usuario existente (nace sin organismo asignado)',
  })
  @ApiResponse({
    status: 201,
    description: 'Responsable creado exitosamente',
    type: ResponsableResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({
    status: 404,
    description: 'El Usuario especificado no existe',
  })
  @ApiResponse({
    status: 409,
    description:
      'El Usuario no está activo, no tiene el rol RESPONSABLE o ya tiene un Responsable asociado',
  })
  async crear(
    @Body() dto: CrearResponsableDto,
  ): Promise<ResponsableResponseDto> {
    const responsable = await this.crearResponsableUseCase.execute(
      dto.usuarioId,
    );
    return this.toResponse(responsable);
  }

  @Get('organismos/:organismoId/responsables')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar los responsables de un organismo' })
  @ApiResponse({
    status: 200,
    description:
      'Responsables recuperados exitosamente (lista vacía si no hay ninguno)',
    type: [ResponsableResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'El Organismo especificado no existe',
  })
  async obtenerPorOrganismo(
    @Param() { organismoId }: ResponsableParamsDto,
  ): Promise<ResponsableResponseDto[]> {
    const responsables =
      await this.obtenerResponsablesPorOrganismoUseCase.execute(organismoId);
    return responsables.map((responsable) => this.toResponse(responsable));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMIN)
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
  @ApiForbiddenResponse({ description: 'Requiere el rol ADMIN' })
  @Patch('responsables/:id/organismo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Endpoint administrativo para vincular un responsable a un organismo',
  })
  @ApiResponse({
    status: 200,
    description: 'Responsable asignado al organismo',
    type: ResponsableResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({
    status: 404,
    description: 'El Responsable o el Organismo especificado no existe',
  })
  @ApiResponse({
    status: 409,
    description: 'El Responsable o el Organismo especificado no está activo',
  })
  async asignarOrganismo(
    @Param() { id }: ResponsableIdParamsDto,
    @Body() { organismoId }: AsignarOrganismoDto,
  ): Promise<ResponsableResponseDto> {
    const responsable = await this.asignarOrganismoAResponsableUseCase.execute(
      id,
      organismoId,
    );
    return this.toResponse(responsable);
  }
}
