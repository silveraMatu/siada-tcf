import { TransaccionLibroBanco } from './transaccion-libro-banco.domain.js';

export class LibroBanco {
  constructor(
    public readonly id: number | null,
    public readonly cuentaMensualId: number,
    public readonly numeroCuentaCte: string | null,
    public readonly transacciones: TransaccionLibroBanco[],
    public readonly fechaCreacion?: Date,
  ) {}
}