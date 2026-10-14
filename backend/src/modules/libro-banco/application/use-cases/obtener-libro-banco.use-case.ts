import { Injectable, NotFoundException } from '@nestjs/common';
import { LibroBancoRepositoryPort } from '../../application/ports/out/libro-banco-repository.port.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';

@Injectable() 
export class ObtenerLibroBancoUseCase {
  constructor(
    private readonly libroBancoRepository: LibroBancoRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
  ) {}

  async execute(cuentaMensualId: number): Promise<LibroBanco[]> {
    const existeCuenta = await this.cuentaMensualRepository.existe(cuentaMensualId);
    if (!existeCuenta) {
      throw new NotFoundException(`La Cuenta Mensual con ID ${cuentaMensualId} no existe.`);
    }

    return await this.libroBancoRepository.buscarPorCuentaMensualId(cuentaMensualId);
  }
}
