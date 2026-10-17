import { Responsable } from '../../../domain/entities/responsable.domain.js';

export abstract class ResponsableRepositoryPort {
  abstract crear(responsable: Responsable): Promise<Responsable>;

  //lista vacía si el organismo no tiene responsables
  abstract buscarPorOrganismo(organismoId: number): Promise<Responsable[]>;
}
