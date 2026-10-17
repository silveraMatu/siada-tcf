import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PasswordHasherPort } from '../../../../application/ports/out/password-hasher.port.js';

const SALT_ROUNDS = 10;

@Injectable()
export class BcryptPasswordHasherAdapter implements PasswordHasherPort {
  async hash(passwordPlana: string): Promise<string> {
    return await bcrypt.hash(passwordPlana, SALT_ROUNDS);
  }

  async comparar(passwordPlana: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(passwordPlana, hash);
  }
}
