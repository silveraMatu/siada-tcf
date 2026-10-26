//ya existe el libro de ingresos y egresos de esa rendición mensual
export class IngresosEgresosDuplicadoError extends Error {
  constructor(public readonly cuentaMensualId: number) {
    super(
      `Ya existe un libro de ingresos y egresos en la cuenta mensual ${cuentaMensualId}.`,
    );
    this.name = 'IngresosEgresosDuplicadoError';
  }
}
