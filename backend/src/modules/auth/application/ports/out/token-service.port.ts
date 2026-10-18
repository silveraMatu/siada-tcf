import type { Rol } from '../../../../usuarios/domain/enums/rol.enum.js';

export interface TokenPayload {
  sub: number;
  email: string;
  roles: Rol[];
}

export abstract class TokenServicePort {
  abstract firmar(payload: TokenPayload): Promise<string>;
}
