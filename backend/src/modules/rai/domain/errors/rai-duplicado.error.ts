//ya existe el libro RAI de esa rendición mensual
export class RaiDuplicadoError extends Error {
  constructor(public readonly cuentaMensualId: number) {
    super(`Ya existe un libro RAI en la cuenta mensual ${cuentaMensualId}.`);
    this.name = 'RaiDuplicadoError';
  }
}
