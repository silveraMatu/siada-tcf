import { Injectable, NotFoundException } from '@nestjs/common';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';

@Injectable()
export class ListarObservacionesUseCase {
  constructor(
    private readonly observacionRepository: ObservacionRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
  ) {}

  async execute(cuentaMensualId: number): Promise<Observaciones[]> {
    const existeCuenta =
      await this.cuentaMensualRepository.existe(cuentaMensualId);
    if (!existeCuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    return await this.observacionRepository.obtenerPorCuentaMensual(
      cuentaMensualId,
    );
  }
}
