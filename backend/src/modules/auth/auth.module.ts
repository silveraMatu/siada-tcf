import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { RegistrarUsuarioUseCase } from './application/use-cases/registrar-usuario.use-case.js';
import { LoginUseCase } from './application/use-cases/login.use-case.js';
import { PasswordHasherPort } from './application/ports/out/password-hasher.port.js';
import { TokenServicePort } from './application/ports/out/token-service.port.js';
import { BcryptPasswordHasherAdapter } from './infrastructure/adapters/driven/security/bcrypt-password-hasher.adapter.js';
import { JwtTokenAdapter } from './infrastructure/adapters/driven/security/jwt-token.adapter.js';
import { JwtStrategy } from './infrastructure/security/jwt.strategy.js';

@Module({
  imports: [
    UsuariosModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const { secret, expiresIn } = configService.get('jwt')!;
        return { secret, signOptions: { expiresIn, algorithm: 'HS256' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    RegistrarUsuarioUseCase,
    LoginUseCase,
    JwtStrategy,
    {
      provide: PasswordHasherPort,
      useClass: BcryptPasswordHasherAdapter,
    },
    {
      provide: TokenServicePort,
      useClass: JwtTokenAdapter,
    },
  ],
  exports: [PasswordHasherPort],
})
export class AuthModule {}
