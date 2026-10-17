export abstract class PasswordHasherPort {
  abstract hash(passwordPlana: string): Promise<string>;

  abstract comparar(passwordPlana: string, hash: string): Promise<boolean>;
}
