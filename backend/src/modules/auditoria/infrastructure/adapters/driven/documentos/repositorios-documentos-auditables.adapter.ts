import { Injectable } from '@nestjs/common';
import { IngresosEgresosRepositoryPort } from '../../../../../ingresos-egresos/application/ports/out/ingresos-egresos-repository.port.js';
import { LibroBancoRepositoryPort } from '../../../../../libro-banco/application/ports/out/libro-banco-repository.port.js';
import { RaciRepositoryPort } from '../../../../../raci/application/ports/out/raci-repository.port.js';
import { RaiRepositoryPort } from '../../../../../rai/application/ports/out/rai-repository.port.js';
import {
  DocumentosAuditablesPort,
  type DocumentosAuditables,
} from '../../../../application/ports/out/documentos-auditables.port.js';

//lee los libros por los puertos que exportan sus módulos, sin control de acceso: quien llama ya lo verificó
@Injectable()
export class RepositoriosDocumentosAuditablesAdapter implements DocumentosAuditablesPort {
  constructor(
    private readonly libroBancoRepository: LibroBancoRepositoryPort,
    private readonly ingresosEgresosRepository: IngresosEgresosRepositoryPort,
    private readonly raciRepository: RaciRepositoryPort,
    private readonly raiRepository: RaiRepositoryPort,
  ) {}

  async cargar(cuentaMensualId: number): Promise<DocumentosAuditables> {
    const [librosBanco, ingresosEgresos, raci, rai] = await Promise.all([
      this.libroBancoRepository.buscarPorCuentaMensualId(cuentaMensualId),
      this.ingresosEgresosRepository.buscarPorCuentaMensualId(cuentaMensualId),
      this.raciRepository.buscarPorCuentaMensualId(cuentaMensualId),
      this.raiRepository.buscarPorCuentaMensualId(cuentaMensualId),
    ]);
    return {
      librosBanco,
      ingresosEgresos: ingresosEgresos ?? undefined,
      raci: raci ?? undefined,
      rai: rai ?? undefined,
    };
  }
}
