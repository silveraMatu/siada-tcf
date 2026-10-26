import { Observaciones } from '../../../domain/entities/observaciones.domain.js';
import { EstadoObservacion } from '../../../domain/rules/validations.js';

export type ConteoObservaciones = Record<EstadoObservacion, number>;

//lo que cambia al revisar una observación
export interface CambiosRevision {
  estado: EstadoObservacion;
  motivoDescarte: string | null;
  revisadaPorId: number | null;
  revisadaEn: Date | null;
}

export abstract class ObservacionRepositoryPort {
  abstract buscarPorId(id: number): Promise<Observaciones | null>;

  //guarda la revisión del auditor y devuelve la observación actualizada
  abstract revisar(
    id: number,
    cambios: CambiosRevision,
  ): Promise<Observaciones>;

  //las de una ejecución, por id
  abstract obtenerPorEjecucion(ejecucionId: number): Promise<Observaciones[]>;

  //cuántas hay en cada estado (con 0 en los que no tienen ninguna)
  abstract contarPorEstado(ejecucionId: number): Promise<ConteoObservaciones>;
}
