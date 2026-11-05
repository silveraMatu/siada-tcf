import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import {
  AccesoCuentaService,
  type ActorAcceso,
} from '../../../cuentas/application/services/acceso-cuenta.service.js';
import { Raci } from '../../domain/entities/raci.domain.js';
import { RaciRepositoryPort } from '../ports/out/raci-repository.port.js';

@Injectable()
export class ObtenerRaciUseCase {
  constructor(
    private readonly raciRepository: RaciRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
  ) {}

  //solo lee quien tiene acceso al organismo de la cuenta (ver AccesoCuentaService)
  async execute(cuentaMensualId: number, actor: ActorAcceso): Promise<Raci> {
    if (!(await this.cuentaMensualRepository.existe(cuentaMensualId))) {
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

    const libro =
      await this.raciRepository.buscarPorCuentaMensualId(cuentaMensualId);
    if (!libro) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no tiene un libro RACI cargado.`,
      );
    }
    return libro;
  }
}
