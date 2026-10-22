import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../services/responsable-del-organismo.service.js';
import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { EstadoCuentaMensual } from '../../domain/enums/estado-cuenta-mensual.enum.js';

//el responsable envía su cuenta a auditoría: desde ahí la evidencia (libros) queda inmutable
@Injectable()
export class PresentarCuentaMensualUseCase {
  constructor(
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
  ) {}

  async execute(
    cuentaMensualId: number,
    usuarioId: number,
  ): Promise<CuentaMensual> {
    const cuenta =
      await this.cuentaMensualRepository.buscarPorId(cuentaMensualId);
    if (!cuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    //solo el responsable del organismo dueño de la cuenta puede presentarla
    //un único mensaje para no revelar cuál de las condiciones falló
    const organismoId =
      await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
    const esDelOrganismo =
      await this.responsableDelOrganismo.esResponsableDelOrganismo(
        usuarioId,
        organismoId,
      );
    if (!esDelOrganismo) {
      throw new ForbiddenException(
        'La Cuenta Mensual no pertenece al organismo del responsable.',
      );
    }

    if (!cuenta.estaEnBorrador()) {
      throw new ConflictException('La cuenta ya fue presentada');
    }

    //presentar es irreversible: una rendición sin ningún libro no tiene nada que auditar
    if (!(await this.cuentaMensualRepository.tieneLibros(cuentaMensualId))) {
      throw new ConflictException(
        'Debe cargar al menos un libro antes de presentar la rendición.',
      );
    }

    //atómico: si otra presentación se coló entre la lectura y este update, no pisa nada
    const cambio = await this.cuentaMensualRepository.cambiarEstado(
      cuentaMensualId,
      EstadoCuentaMensual.EN_BORRADOR,
      EstadoCuentaMensual.LISTO_PARA_AUDITAR,
    );
    if (!cambio) {
      throw new ConflictException('La cuenta ya fue presentada');
    }

    const presentada =
      await this.cuentaMensualRepository.buscarPorId(cuentaMensualId);
    return presentada!;
  }
}
