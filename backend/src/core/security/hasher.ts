import bcrypt from "bcryptjs";

export interface IPasswordHasher{
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

export class HashPasswordService implements IPasswordHasher {
  async hash(password: string): Promise<string> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    return hashedPassword;
  }

  async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
} 