export class CuentaMensual {
  constructor(
    public readonly mes: number,
    public readonly cuentaAnualId: number,
    public readonly estado: string,
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
  ) {}
}
