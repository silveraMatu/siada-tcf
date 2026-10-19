import { Responsable } from '../../../domain/entities/responsable.domain.js';

export abstract class ResponsableRepositoryPort {
  //lanza ConflictException si el usuario ya tiene un responsable
  abstract crear(responsable: Responsable): Promise<Responsable>;

  abstract buscarPorId(id: number): Promise<Responsable | null>;

  abstract buscarPorUsuarioId(usuarioId: number): Promise<Responsable | null>;

  //actualiza solo los campos recibidos; id, usuarioId y fechaCreacion nunca se modifican
  abstract actualizar(
    id: number,
    datos: Partial<Responsable>,
  ): Promise<Responsable>;

  //cada responsable trae su usuario
  //TODO: Usar luego para desasignar
  abstract listar(filtros?: { sinOrganismo?: boolean }): Promise<Responsable[]>;

  //lista vacía si el organismo no tiene responsables
  abstract buscarPorOrganismo(organismoId: number): Promise<Responsable[]>;
}
