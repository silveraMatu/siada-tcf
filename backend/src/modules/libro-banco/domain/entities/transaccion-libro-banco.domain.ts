export class TransaccionLibroBanco {
  constructor(
    public readonly id: number | null,
    public readonly fecha: string | null,
    public readonly cheque: string | null,
    public readonly aLaOrdenDe: string,
    public readonly depositos: number,
    public readonly retiro: number,
    public readonly saldo: number,
  ) {}
}