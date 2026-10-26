import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualRepositoryPort } from '../ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../services/responsable-del-organismo.service.js';
import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';

//el responsable envía su cuenta a auditoría: desde ahí la evidencia (libros) queda inmutable
@Injectable()
export class PresentarCuentaMensualUseCase {
  constructor(
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
    private readonly actividad: ContextoActividadPort,
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
    if (organismoId !== null) this.actividad.organismo(organismoId);
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

    //presentar es irreversible: la rendición debe traer todos los documentos que se cruzan al auditar
    const faltantes =
      await this.cuentaMensualRepository.documentosFaltantes(cuentaMensualId);
    if (faltantes.length > 0) {
      throw new ConflictException(
        `Faltan documentos para presentar la rendición: ${faltantes.join(', ')}.`,
      );
    }

    //atómico: si otra presentación se coló entre la lectura y este update, no pisa nada
    const cambio = await this.cuentaMensualRepository.presentar(
      cuentaMensualId,
      usuarioId,
    );
    if (!cambio) {
      throw new ConflictException('La cuenta ya fue presentada');
    }

    const presentada =
      await this.cuentaMensualRepository.buscarPorId(cuentaMensualId);
    return presentada!;
  }
}
