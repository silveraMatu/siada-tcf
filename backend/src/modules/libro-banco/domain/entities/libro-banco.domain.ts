import { TransaccionLibroBanco } from './transaccion-libro-banco.domain.js';

export class LibroBanco {
  constructor(
    public readonly cuentaMensualId: number,
    public readonly numeroCuentaCte: string | null,
    public readonly transacciones: TransaccionLibroBanco[],
    public readonly id?: number,
    public readonly fechaCreacion?: Date,
    //quién lo subió y sha256 de su contenido (ver calcularHashContenido); la fecha de subida es fechaCreacion
    public readonly subidoPorId?: number,
    public readonly hashContenido?: string,
  ) {}
}
