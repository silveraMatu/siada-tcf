import { Organismo } from '../../../domain/entities/organismo.domain.js';

export abstract class OrganismoRepositoryPort {

  abstract crear(organismo: Organismo): Promise<Organismo>;

  abstract buscarPorId(id: number): Promise<Organismo | null>;

  abstract activar(id: number): Promise<void>;

  abstract desactivar(id: number): Promise<void>;
}
