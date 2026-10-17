import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistroDto } from './dto/registro.dto.js';
import { UsuarioResponseDto } from './dto/usuario-response.dto.js';
import {
  RegistrarUsuarioUseCase,
  type UsuarioSinPassword,
} from '../../application/use-cases/registrar-usuario.use-case.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registrarUsuarioUseCase: RegistrarUsuarioUseCase,
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

  //endpoint público
  @Post('registro')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar un nuevo usuario',
    description:
      'Endpoint público. El usuario se crea inactivo (active: false) y sin roles, a la espera de la aprobación de un administrador. No puede operar hasta ser habilitado.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Usuario registrado, inactivo y pendiente de aprobación del administrador',
    type: UsuarioResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({
    status: 409,
    description:
      'No se pudo completar el registro (mensaje genérico: no indica qué dato ya existe)',
  })
  async registro(@Body() dto: RegistroDto): Promise<UsuarioResponseDto> {
    const usuario = await this.registrarUsuarioUseCase.execute(dto);
    return this.toResponse(usuario);
  }
}
