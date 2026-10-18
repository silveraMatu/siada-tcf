import { ConflictException, Injectable } from '@nestjs/common';
import { UsuarioRepositoryPort } from '../../../usuarios/application/ports/out/usuario-repository.port.js';
import {
  Usuario,
  type UsuarioSinPassword,
} from '../../../usuarios/domain/entities/usuario.domain.js';
import { PasswordHasherPort } from '../ports/out/password-hasher.port.js';

export interface RegistrarUsuarioComando {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  password: string;
}

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
    dni,
    email,
    password,
  }: RegistrarUsuarioComando): Promise<UsuarioSinPassword> {
    if (
      (await this.usuarioRepository.buscarPorEmail(email)) ||
      (await this.usuarioRepository.buscarPorDni(dni))
    ) {
      throw new ConflictException(
        'No se pudo completar el registro con los datos ingresados.',
      );
    }

    const passwordHasheada = await this.passwordHasher.hash(password);
    const creado = await this.usuarioRepository.crear(
      new Usuario(nombre, apellido, dni, email, passwordHasheada, false, []),
    );

    const { password: _password, ...usuarioSinPassword } = creado;
    return usuarioSinPassword;
  }
}
