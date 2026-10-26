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
import { IngresosEgresos } from '../../domain/entities/ingresos-egresos.domain.js';
import { IngresosEgresosRepositoryPort } from '../ports/out/ingresos-egresos-repository.port.js';

@Injectable()
export class ObtenerIngresosEgresosUseCase {
  constructor(
    private readonly ingresosEgresosRepository: IngresosEgresosRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
  ) {}

  //solo lee quien tiene acceso al organismo de la cuenta (ver AccesoCuentaService)
  async execute(
    cuentaMensualId: number,
    actor: ActorAcceso,
  ): Promise<IngresosEgresos> {
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
      await this.ingresosEgresosRepository.buscarPorCuentaMensualId(
        cuentaMensualId,
      );
    if (!libro) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no tiene un libro de ingresos y egresos cargado.`,
      );
    }
    return libro;
  }
}
