export class CuentaAnual{
  constructor(
    public readonly id: number | null,
    public readonly ejercicioFiscal: number,
    public readonly organismoId: number,
    public readonly fechaCreacion?: Date
  )
  { }
}
