import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegistroDto } from './dto/registro.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { UsuarioResponseDto } from '../../../usuarios/infrastructure/http/dto/usuario-response.dto.js';
import { toUsuarioResponse } from '../../../usuarios/infrastructure/http/usuario-response.mapper.js';
import { RegistrarUsuarioUseCase } from '../../application/use-cases/registrar-usuario.use-case.js';
import { LoginUseCase } from '../../application/use-cases/login.use-case.js';
import { Registrar } from '../../../registro-actividad/infrastructure/http/registrar.decorator.js';
import {
  AccionActividad,
  TipoEntidadActividad,
} from '../../../registro-actividad/domain/enums/accion-actividad.enum.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registrarUsuarioUseCase: RegistrarUsuarioUseCase,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  //endpoint público
  @Registrar(AccionActividad.USUARIO_REGISTRADO, {
    entidad: TipoEntidadActividad.USUARIO,
    idRespuesta: 'id',
  })
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
    return toUsuarioResponse(usuario);
  }

  //endpoint público
  @Registrar(AccionActividad.LOGIN)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar sesión',
    description:
      'Endpoint público. Devuelve un JWT (válido 12 horas) con el id, el email y los roles del usuario. Una cuenta que todavía no fue activada por un administrador no puede iniciar sesión.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión iniciada',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({
    status: 401,
    description:
      'Credenciales inválidas, o la cuenta está pendiente de activación por un administrador',
  })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return await this.loginUseCase.execute(dto);
  }
}
