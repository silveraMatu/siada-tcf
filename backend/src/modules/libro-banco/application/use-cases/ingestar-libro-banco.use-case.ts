import { Injectable, NotFoundException } from '@nestjs/common';
import { LibroBancoRepositoryPort } from '../ports/out/libro-banco-repository.port.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { UploadLibroBancoDto } from '../../infrastructure/http/dto/upload-libro-banco.dto.js';
import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../domain/entities/transaccion-libro-banco.domain.js';

@Injectable()
export class IngestarLibroBancoUseCase {
  constructor(
    private readonly libroBancoRepository: LibroBancoRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
  ) {}

  async execute(cuentaMensualId: number, dto: UploadLibroBancoDto): Promise<LibroBanco> {
    //validamos existencia de la cuenta mensual
    const existeCuenta = await this.cuentaMensualRepository.existe(cuentaMensualId);
    if (!existeCuenta) {
      throw new NotFoundException(`La Cuenta Mensual con ID ${cuentaMensualId} no existe.`);
    }

    //mapping del dto a la entidad de dominio
    const transaccionesDomain = dto.transacciones.map(
      (t) =>
        new TransaccionLibroBanco(
          null,
          t.fecha ?? null,
          t.cheque ?? null,
          t.aLaOrdenDe,
          t.depositos,
          t.retiro,
          t.saldo,
        ),
    );

    const libroBancoDomain = new LibroBanco(
      null,
      cuentaMensualId,
      dto.numeroCuentaCte ?? null,
      transaccionesDomain,
    );

    //prsistir usando el Puerto de Salida
    return await this.libroBancoRepository.guardar(libroBancoDomain);
  }
}