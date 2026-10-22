//ya existe un libro para esa cuenta corriente dentro de la rendición mensual
export class LibroBancoDuplicadoError extends Error {
  constructor(
    public readonly cuentaMensualId: number,
    public readonly numeroCuentaCte: string,
  ) {
    super(
      `Ya existe un libro para la cuenta corriente ${numeroCuentaCte} en la cuenta mensual ${cuentaMensualId}.`,
    );
    this.name = 'LibroBancoDuplicadoError';
  }
}
