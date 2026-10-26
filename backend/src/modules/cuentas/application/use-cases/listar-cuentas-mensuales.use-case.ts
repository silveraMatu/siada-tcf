import { Injectable } from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../ports/out/cuenta-mensual-repository.port.js';
import { CuentaMensualListada } from '../../domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../domain/enums/estado-cuenta-mensual.enum.js';
import {
  AccesoCuentaService,
  type ActorAcceso,
} from '../services/acceso-cuenta.service.js';

@Injectable()
export class ListarCuentasMensualesUseCase {
  constructor(
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly accesoCuenta: AccesoCuentaService,
  ) {}

  //lista vacía si ninguna coincide; un ADMIN ve todas y un AUDITOR, solo las de los organismos que tiene asignados
  async execute(
    filtros: { estado?: EstadoCuentaMensual },
    actor: ActorAcceso,
  ): Promise<CuentaMensualListada[]> {
    const organismoIds = await this.accesoCuenta.organismosVisibles(actor);
    if (organismoIds !== null && organismoIds.length === 0) return [];

    return await this.cuentaMensualRepository.listar({
      ...filtros,
      ...(organismoIds !== null && { organismoIds }),
    });
  }
}
