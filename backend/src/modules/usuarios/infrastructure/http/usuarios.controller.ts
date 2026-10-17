import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ActivarUsuarioDto } from './dto/activar-usuario.dto.js';
import { ListarUsuariosQueryDto } from './dto/listar-usuarios-query.dto.js';
import { UsuarioIdParamsDto } from './dto/usuario-id-params.dto.js';
import { UsuarioResponseDto } from './dto/usuario-response.dto.js';
import { ListarUsuariosUseCase } from '../../application/use-cases/listar-usuarios.use-case.js';
import { ActivarUsuarioYAsignarRolesUseCase } from '../../application/use-cases/activar-usuario-y-asignar-roles.use-case.js';
import type { UsuarioSinPassword } from '../../domain/entities/usuario.domain.js';

@ApiTags('Usuarios')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly listarUsuariosUseCase: ListarUsuariosUseCase,
    private readonly activarUsuarioYAsignarRolesUseCase: ActivarUsuarioYAsignarRolesUseCase,
  ) {}

  private toResponse(usuario: UsuarioSinPassword): UsuarioResponseDto {
    return {
      id: usuario.id!,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      cuitDni: usuario.cuitDni,
      email: usuario.email,
      active: usuario.active,
      roles: usuario.roles,
      fechaCreacion: usuario.fechaCreacion!.toISOString(),
    };
  }

  // TODO: Proteger con @UseGuards() y @Roles('ADMIN') en el futuro
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
    return usuarios.map((usuario) => this.toResponse(usuario));
  }

  // TODO: Proteger con @UseGuards() y @Roles('ADMIN') en el futuro
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
    return this.toResponse(usuario);
  }
}
