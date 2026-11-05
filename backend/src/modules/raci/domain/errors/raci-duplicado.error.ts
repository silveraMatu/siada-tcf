//ya existe el libro RACI de esa rendición mensual
export class RaciDuplicadoError extends Error {
  constructor(public readonly cuentaMensualId: number) {
    super(`Ya existe un libro RACI en la cuenta mensual ${cuentaMensualId}.`);
    this.name = 'RaciDuplicadoError';
  }
}
