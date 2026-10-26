import { Observaciones } from '../../../domain/entities/observaciones.domain.js';
import type { EstadoObservacion } from '../../../domain/rules/validations.js';

export type ConteoObservaciones = Record<EstadoObservacion, number>;

export abstract class ObservacionRepositoryPort {
  //las de una ejecución, por id
  abstract obtenerPorEjecucion(ejecucionId: number): Promise<Observaciones[]>;

  //cuántas hay en cada estado (con 0 en los que no tienen ninguna)
  abstract contarPorEstado(ejecucionId: number): Promise<ConteoObservaciones>;
}
