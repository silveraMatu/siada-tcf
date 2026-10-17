import { Responsable } from '../../../domain/entities/responsable.domain.js';

export abstract class ResponsableRepositoryPort {
  abstract crear(responsable: Responsable): Promise<Responsable>;

  abstract buscarPorId(id: number): Promise<Responsable | null>;

  //actualiza solo los campos recibidos; id y fechaCreacion nunca se modifican
  abstract actualizar(id: number, datos: Partial<Responsable>): Promise<Responsable>;

  //lista vacía si el organismo no tiene responsables
  abstract buscarPorOrganismo(organismoId: number): Promise<Responsable[]>;
}
