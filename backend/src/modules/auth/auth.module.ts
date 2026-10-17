import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { RegistrarUsuarioUseCase } from './application/use-cases/registrar-usuario.use-case.js';
import { PasswordHasherPort } from './application/ports/out/password-hasher.port.js';
import { BcryptPasswordHasherAdapter } from './infrastructure/adapters/driven/security/bcrypt-password-hasher.adapter.js';

@Module({
  imports: [UsuariosModule],
  controllers: [AuthController],
  providers: [
    RegistrarUsuarioUseCase,
    {
      provide: PasswordHasherPort,
      useClass: BcryptPasswordHasherAdapter,
    },
  ],
  exports: [PasswordHasherPort],
})
export class AuthModule {}
