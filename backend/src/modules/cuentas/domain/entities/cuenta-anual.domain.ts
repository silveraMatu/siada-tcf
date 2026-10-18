export class CuentaAnual {
  constructor(
    public readonly ejercicioFiscal: number,
    public readonly organismoId: number,
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
  ) {}
}
