import { Observaciones } from '../../../domain/entities/observaciones.domain.js';

export abstract class ObservacionRepositoryPort {
  //persiste los hallazgos nuevos sin duplicar los que ya existen y devuelve los persistidos (con id)
  abstract guardarVarias(
    observaciones: Observaciones[],
  ): Promise<Observaciones[]>;

  abstract obtenerPorCuentaMensual(
    cuentaMensualId: number,
  ): Promise<Observaciones[]>;
}
