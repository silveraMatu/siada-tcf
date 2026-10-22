import { Injectable } from '@nestjs/common';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';
import type { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import type { ReglaAuditoria } from '../../domain/rules/regla-auditoria.interface.js';
import { LibroBancoV3Rule } from '../../domain/rules/libro-banco-saldo.rule.js';

@Injectable()
export class AuditarLibroBancoUseCase {
  //reglas que corren sobre el libro banco, hoy solo la V3 (saldo)
  private readonly reglas: ReglaAuditoria[] = [new LibroBancoV3Rule()];

  constructor(
    private readonly observacionRepository: ObservacionRepositoryPort,
  ) {}

  //los libros llegan por parámetro: este caso de uso no lee otros módulos
  async execute(
    cuentaMensualId: number,
    librosBanco: LibroBanco[],
  ): Promise<Observaciones[]> {
    const contexto = { cuentaMensualId, librosBanco };

    const observaciones = this.reglas.flatMap((regla) =>
      regla.execute(contexto),
    );

    return await this.observacionRepository.guardarVarias(observaciones);
  }
}
