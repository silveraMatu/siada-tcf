import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LibroBancoRepositoryPort } from '../ports/out/libro-banco-repository.port.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../domain/entities/transaccion-libro-banco.domain.js';

//entrada del caso de uso, independiente del DTO HTTP
export interface IngestarLibroBancoComando {
  numeroCuentaCte?: string;
  transacciones: {
    fecha?: string;
    cheque?: string;
    aLaOrdenDe: string;
    depositos: number;
    retiro: number;
    saldo: number;
  }[];
}

@Injectable()
export class IngestarLibroBancoUseCase {
  constructor(
    private readonly libroBancoRepository: LibroBancoRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
  ) {}

  async execute(
    cuentaMensualId: number,
    comando: IngestarLibroBancoComando,
  ): Promise<LibroBanco> {
    //validamos existencia de la cuenta mensual
    const cuenta =
      await this.cuentaMensualRepository.buscarPorId(cuentaMensualId);
    if (!cuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    //candado: una cuenta ya enviada a auditoría no admite cambios en su evidencia
    if (!cuenta.estaEnBorrador()) {
      throw new ConflictException(
        'No se pueden modificar ni subir libros a una cuenta que ya fue enviada a auditoría.',
      );
    }

    //mapping del comando a la entidad de dominio
    const transaccionesDomain = comando.transacciones.map(
      (t) =>
        new TransaccionLibroBanco(
          t.fecha ?? null,
          t.cheque ?? null,
          t.aLaOrdenDe,
          t.depositos,
          t.retiro,
          t.saldo,
        ),
    );

    const libroBancoDomain = new LibroBanco(
      cuentaMensualId,
      comando.numeroCuentaCte ?? null,
      transaccionesDomain,
    );

    //persistir usando el Puerto de Salida
    return await this.libroBancoRepository.guardar(libroBancoDomain);
  }
}
