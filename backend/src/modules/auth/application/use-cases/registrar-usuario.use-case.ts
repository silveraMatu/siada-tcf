import { ConflictException, Injectable } from '@nestjs/common';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import { Usuario } from '../../../usuarios/domain/entities/usuario.domain.js';
import { PasswordHasherPort } from '../ports/out/password-hasher.port.js';

export interface RegistrarUsuarioComando {
  nombre: string;
  apellido: string;
  cuitDni: string;
  email: string;
  password: string;
}

export type UsuarioSinPassword = Omit<Usuario, 'password'>;

@Injectable()
export class RegistrarUsuarioUseCase {
  constructor(
    private readonly usuarioRepository: UsuarioRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  //el usuario nace inactivo y sin roles, un administrador debe aprobarlo y asignarle roles
  async execute({
    nombre,
    apellido,
    cuitDni,
    email,
    password,
  }: RegistrarUsuarioComando): Promise<UsuarioSinPassword> {
    if (
      (await this.usuarioRepository.buscarPorEmail(email)) ||
      (await this.usuarioRepository.buscarPorCuitDni(cuitDni))
    ) {
      throw new ConflictException(
        'No se pudo completar el registro con los datos ingresados.',
      );
    }

    const passwordHasheada = await this.passwordHasher.hash(password);
    const creado = await this.usuarioRepository.crear(
      new Usuario(
        nombre,
        apellido,
        cuitDni,
        email,
        passwordHasheada,
        false,
        [],
      ),
    );

    const { password: _password, ...usuarioSinPassword } = creado;
    return usuarioSinPassword;
  }
}
