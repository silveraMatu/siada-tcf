import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { Rol } from '../../domain/enums/rol.enum.js';
import { ActivarUsuarioDto } from './dto/activar-usuario.dto.js';
import { ListarUsuariosQueryDto } from './dto/listar-usuarios-query.dto.js';
import { UsuarioIdParamsDto } from './dto/usuario-id-params.dto.js';
import { UsuarioResponseDto } from './dto/usuario-response.dto.js';
import { toUsuarioResponse } from './usuario-response.mapper.js';
import { ListarUsuariosUseCase } from '../../application/use-cases/listar-usuarios.use-case.js';
import { ActivarUsuarioYAsignarRolesUseCase } from '../../application/use-cases/activar-usuario-y-asignar-roles.use-case.js';

@ApiTags('Usuarios')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Falta el token o no es válido' })
@ApiForbiddenResponse({ description: 'Requiere el rol ADMIN' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMIN)
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly listarUsuariosUseCase: ListarUsuariosUseCase,
    private readonly activarUsuarioYAsignarRolesUseCase: ActivarUsuarioYAsignarRolesUseCase,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar usuarios (endpoint administrativo)',
    description:
      'Devuelve todos los usuarios ordenados por id. Con ?active=false lista solo los pendientes de aprobación; con ?active=true, solo los habilitados. Nunca incluye la contraseña.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Usuarios recuperados exitosamente (lista vacía si no hay ninguno)',
    type: [UsuarioResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: 'El filtro active debe ser true o false',
  })
  async listar(
    @Query() { active }: ListarUsuariosQueryDto,
  ): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.listarUsuariosUseCase.execute({ active });
    return usuarios.map((usuario) => toUsuarioResponse(usuario));
  }

  @Patch(':id/activar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Activar o desactivar un usuario y asignarle roles (endpoint administrativo)',
    description:
      'Los roles enviados reemplazan a los actuales. Un usuario activo debe tener al menos un rol; un usuario inactivo puede quedar sin roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuario actualizado',
    type: UsuarioResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos de entrada inválidos (incluye activar un usuario sin roles)',
  })
  @ApiResponse({
    status: 404,
    description: 'El Usuario especificado no existe',
  })
  async activar(
    @Param() { id }: UsuarioIdParamsDto,
    @Body() { active, roles }: ActivarUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    const usuario = await this.activarUsuarioYAsignarRolesUseCase.execute(
      id,
      active,
      roles,
    );
    return toUsuarioResponse(usuario);
  }
}
