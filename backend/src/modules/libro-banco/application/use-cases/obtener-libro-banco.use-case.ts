import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LibroBancoRepositoryPort } from '../../application/ports/out/libro-banco-repository.port.js';
import { CuentaMensualRepositoryPort } from '../../../cuentas/application/ports/out/cuenta-mensual-repository.port.js';
import { ResponsableDelOrganismoService } from '../../../cuentas/application/services/responsable-del-organismo.service.js';
import { LibroBanco } from '../../domain/entities/libro-banco.domain.js';

@Injectable()
export class ObtenerLibroBancoUseCase {
  constructor(
    private readonly libroBancoRepository: LibroBancoRepositoryPort,
    private readonly cuentaMensualRepository: CuentaMensualRepositoryPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
  ) {}

  //con `soloResponsableDe` solo el responsable del organismo dueño de la cuenta puede leerla
  //sin él no se verifica la propiedad (lo usa auditoría, ya restringida a ADMIN y AUDITOR)
  async execute(
    cuentaMensualId: number,
    soloResponsableDe?: { usuarioId: number },
  ): Promise<LibroBanco[]> {
    const existeCuenta =
      await this.cuentaMensualRepository.existe(cuentaMensualId);
    if (!existeCuenta) {
      throw new NotFoundException(
        `La Cuenta Mensual con ID ${cuentaMensualId} no existe.`,
      );
    }

    if (soloResponsableDe) {
      const organismoId =
        await this.cuentaMensualRepository.obtenerOrganismoId(cuentaMensualId);
      if (
        !(await this.responsableDelOrganismo.esResponsableDelOrganismo(
          soloResponsableDe.usuarioId,
          organismoId,
        ))
      ) {
        throw new ForbiddenException(
          'La Cuenta Mensual no pertenece al organismo del responsable.',
        );
      }
    }

    return await this.libroBancoRepository.buscarPorCuentaMensualId(
      cuentaMensualId,
    );
  }
}
