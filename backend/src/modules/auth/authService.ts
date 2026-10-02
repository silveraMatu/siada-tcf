import { BadRequestError, UnauthorizedError } from "../../core/errors/index.js";
import { IPasswordHasher } from "../../core/security/hasher.js";
import { NewUser, User } from "../user/userEntity.js";
import { IUserRepository } from "../user/userRepository.types.js";

export class AuthService {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly hasher: IPasswordHasher
  ) {}

  async register(dto: NewUser): Promise<Omit<User, 'password'>> {
    const existe = await this.userRepo.findByEmail(dto.email);
    if (existe) {
      throw new BadRequestError('El correo electrónico ya se encuentra registrado.');
    }

    const hash = await this.hasher.hash(dto.password);
    const usuarioCreado = await this.userRepo.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: hash,
      role: dto.role,
    });

    const { password, ...usuarioPublico } = usuarioCreado;
    return usuarioPublico;
  }

  async login(dto: Pick<NewUser, 'email' | 'password'>): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Credenciales inválidas.');
    }

    const passwordValido = await this.hasher.compare(dto.password, user.password);
    if (!passwordValido) {
      throw new UnauthorizedError('Credenciales inválidas.');
    }

    const { password, ...usuarioPublico } = user;
    return usuarioPublico;
  }
}