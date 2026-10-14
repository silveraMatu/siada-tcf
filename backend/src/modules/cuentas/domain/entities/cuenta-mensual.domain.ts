export class CuentaMensual{
  constructor(
    public readonly id: number | null,
    public readonly mes: number,
    public readonly cuentaAnualId: number,
    public readonly fechaCreacion?: Date,
  )
  {}
}
