import { Injectable } from '@nestjs/common';
import { IngresosEgresosRepositoryPort } from '../../../../../ingresos-egresos/application/ports/out/ingresos-egresos-repository.port.js';
import { LibroBancoRepositoryPort } from '../../../../../libro-banco/application/ports/out/libro-banco-repository.port.js';
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
  ) {}

  async cargar(cuentaMensualId: number): Promise<DocumentosAuditables> {
    const [librosBanco, ingresosEgresos] = await Promise.all([
      this.libroBancoRepository.buscarPorCuentaMensualId(cuentaMensualId),
      this.ingresosEgresosRepository.buscarPorCuentaMensualId(cuentaMensualId),
    ]);
    return { librosBanco, ingresosEgresos: ingresosEgresos ?? undefined };
  }
}
