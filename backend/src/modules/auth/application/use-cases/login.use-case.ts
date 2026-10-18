import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import { PasswordHasherPort } from '../ports/out/password-hasher.port.js';
import { TokenServicePort } from '../ports/out/token-service.port.js';

//hash bcrypt de un valor descartable: se compara cuando el email no existe para que el tiempo de respuesta no lo delate
const HASH_FICTICIO =
  '$2b$10$WW.Z6gBZFzuR.FQUV3dzGufznOdwND.hBNP/zHW62JPxxEuNcu67.';

export interface LoginComando {
  email: string;
  password: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort,
  ) {}

  async execute({
    email,
    password,
  }: LoginComando): Promise<{ accessToken: string }> {
    const usuario = await this.usuarioRepository.buscarPorEmail(email);

    const passwordValida = await this.passwordHasher.comparar(
      password,
      usuario?.password ?? HASH_FICTICIO,
    );
    //mismo mensaje si el email no existe o la clave es incorrecta
    if (!usuario || !passwordValida) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    //solo se llega aqui con la clave correcta, asi que no revela el estado de la cuenta a un desconocido
    if (!usuario.active) {
      throw new UnauthorizedException(
        'Su cuenta está pendiente de activación por un administrador',
      );
    }

    const accessToken = await this.tokenService.firmar({
      sub: usuario.id!,
      email: usuario.email,
      roles: usuario.roles,
    });
    return { accessToken };
  }
}
