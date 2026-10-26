import { Injectable } from '@nestjs/common';
import { ObservacionRepositoryPort } from '../ports/out/observacion-repository.port.js';
import type { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { MotorAuditoriaService } from '../../domain/engine/motor-auditoria.service.js';
import type { Observaciones } from '../../domain/entities/observaciones.domain.js';
import {
  EstadoValidacion,
  type ResultadoValidacion,
} from '../../domain/types/auditoria.types.js';

@Injectable()
export class AuditarLibroBancoUseCase {
  constructor(
    private readonly motor: MotorAuditoriaService,
    private readonly observacionRepository: ObservacionRepositoryPort,
  ) {}

  //los libros llegan por parámetro: este caso de uso no lee otros módulos
  async execute(
    cuentaMensualId: number,
    librosBanco: LibroBanco[],
  ): Promise<ResultadoValidacion[]> {
    const resultados = this.motor.ejecutarAuditoriaCompleta({
      cuentaMensualId,
      librosBanco,
    });

    //solo los resultados FALLO traen hallazgos que persistir
    const persistidas = await this.observacionRepository.guardarVarias(
      resultados
        .filter((r) => r.estado === EstadoValidacion.FALLO)
        .flatMap((r) => r.observaciones),
    );

    //los resultados FALLO se devuelven con lo persistido (con id, incluidos hallazgos de corridas anteriores)
    const porRegla = new Map<string, Observaciones[]>();
    for (const observacion of persistidas) {
      const lista = porRegla.get(observacion.codigoRegla) ?? [];
      lista.push(observacion);
      porRegla.set(observacion.codigoRegla, lista);
    }

    return resultados.map((resultado) =>
      resultado.estado === EstadoValidacion.FALLO
        ? {
            ...resultado,
            observaciones: porRegla.get(resultado.codigoRegla) ?? [],
          }
        : resultado,
    );
  }
}
