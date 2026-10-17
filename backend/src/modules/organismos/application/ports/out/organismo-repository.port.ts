import { Organismo } from '../../../domain/entities/organismo.domain.js';

export abstract class OrganismoRepositoryPort {
  abstract crear(organismo: Organismo): Promise<Organismo>;

  abstract buscarPorId(id: number): Promise<Organismo | null>;

  abstract buscarTodos(): Promise<Organismo[]>;

  //devuelve false si no existe un organismo con ese id
  abstract activar(id: number): Promise<boolean>;

  abstract desactivar(id: number): Promise<boolean>;
}
