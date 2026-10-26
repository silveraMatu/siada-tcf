import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import type { UsuarioAutenticado } from './usuario-autenticado.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usuarioRepository: UsuarioRepositoryPort,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret')!,
      algorithms: ['HS256'],
    });
  }

  //se consulta la base en cada request: desactivar a un usuario o quitarle un rol surte efecto de inmediato
  async validate(payload: { sub?: unknown }): Promise<UsuarioAutenticado> {
    if (typeof payload.sub !== 'number') {
      throw new UnauthorizedException('Token inválido');
    }
    const usuario = await this.usuarioRepository.buscarPorId(payload.sub);
    if (!usuario || !usuario.active) {
      throw new UnauthorizedException('Token inválido');
    }
    return {
      id: usuario.id!,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      dni: usuario.dni,
      roles: usuario.roles,
    };
  }
}
