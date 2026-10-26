import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LibroBancoRepositoryPort } from '../../application/ports/out/libro-banco-repository.port.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import {
  AccesoCuentaService,
  type ActorAcceso,
} from '../../../cuentas/application/services/acceso-cuenta.service.js';
import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';

@Injectable()
export class ObtenerLibroBancoUseCase {
  constructor(
    private readonly libroBancoRepository: LibroBancoRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
  ) {}

  //solo lee quien tiene acceso al organismo de la cuenta (ver AccesoCuentaService)
  async execute(
    cuentaMensualId: number,
    actor: ActorAcceso,
  ): Promise<LibroBanco[]> {
    const existeCuenta =
      await this.cuentaMensualRepository.existe(cuentaMensualId);
    if (!existeCuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    const organismoId =
      await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
    if (!(await this.accesoCuenta.puedeLeer(actor, organismoId))) {
      throw new ForbiddenException(
        'La Cuenta Mensual no pertenece a un organismo al que tenga acceso.',
      );
    }

    return await this.libroBancoRepository.buscarPorCuentaMensualId(
      cuentaMensualId,
    );
  }
}
