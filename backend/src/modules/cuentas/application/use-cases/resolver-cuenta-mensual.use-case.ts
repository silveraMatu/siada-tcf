import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualResolverPort } from '../ports/out/cuenta-mensual-resolver.port.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';
import { ResponsableDelOrganismoService } from '../services/responsable-del-organismo.service.js';
import { ContextoActividadPort } from '../../../registro-actividad/application/ports/out/contexto-actividad.port.js';

//quién pide resolver la cuenta; el administrador puede hacerlo para cualquier organismo
export interface SolicitanteResolver {
  usuarioId: number;
  esAdmin: boolean;
}

@Injectable()
export class ResolverCuentaMensualUseCase {
  constructor(
    private readonly organismoRepo: OrganismoRepositoryPort,
    private readonly cuentaMensualResolver: CuentaMensualResolverPort,
    private readonly responsableDelOrganismo: ResponsableDelOrganismoService,
    private readonly actividad: ContextoActividadPort,
  ) {}

  async execute(
    organismoId: number,
    ejercicioFiscal: number,
    mes: number,
    solicitante: SolicitanteResolver,
  ): Promise<CuentaMensual> {
    this.actividad.organismo(organismoId);
    this.actividad.detalle({ ejercicioFiscal, mes });
    //primero la propiedad: resolver crea filas y un 404 distinto revelaría qué organismos existen
    if (
      !solicitante.esAdmin &&
      !(await this.responsableDelOrganismo.esResponsableDelOrganismo(
        solicitante.usuarioId,
        organismoId,
      ))
    ) {
      throw new ForbiddenException(
        'El organismo no corresponde al responsable.',
      );
    }

    const organismo = await this.organismoRepo.buscarPorId(organismoId);
    if (!organismo) {
      throw new NotFoundException(
        `El Organismo con ID ${organismoId} no existe.`,
      );
    }
    if (!organismo.active) {
      throw new ConflictException(
        `El Organismo con ID ${organismoId} no está activo.`,
      );
    }

    return await this.cuentaMensualResolver.resolver(
      organismoId,
      ejercicioFiscal,
      mes,
    );
  }
}
