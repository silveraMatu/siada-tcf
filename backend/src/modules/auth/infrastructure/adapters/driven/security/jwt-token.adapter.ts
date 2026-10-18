import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  type TokenPayload,
  TokenServicePort,
} from '../../../../application/ports/out/token-service.port.js';

@Injectable()
export class JwtTokenAdapter implements TokenServicePort {
  constructor(private readonly jwtService: JwtService) {}

  async firmar(payload: TokenPayload): Promise<string> {
    return await this.jwtService.signAsync(payload);
  }
}
