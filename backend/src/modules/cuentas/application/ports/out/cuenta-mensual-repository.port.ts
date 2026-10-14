export abstract class CuentaMensualRepositoryPort {
  abstract existe(cuentaMensualId: number): Promise<boolean>;
}
