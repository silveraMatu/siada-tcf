import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CuentaMensualResolverPort } from '../ports/out/cuenta-mensual-resolver.port.js';
import { OrganismoRepositoryPort } from '../../../organismos/application/ports/out/organismo-repository.port.js';
import { CuentaMensual } from '../../domain/entities/cuenta-mensual.domain.js';

@Injectable()
export class ResolverCuentaMensualUseCase {
  constructor(
    private readonly organismoRepo: OrganismoRepositoryPort,
    private readonly cuentaMensualResolver: CuentaMensualResolverPort,
  ) {}

  async execute(
    organismoId: number,
    ejercicioFiscal: number,
    mes: number,
  ): Promise<CuentaMensual> {
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
