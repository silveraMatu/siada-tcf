import { Organismo } from '../../../domain/entities/organismo.domain.js';

export abstract class OrganismoRepositoryPort {
  abstract crear(organismo: Organismo): Promise<Organismo>;

  abstract buscarPorId(id: number): Promise<Organismo | null>;

  //con el auditor asignado (solo id, nombre y apellido)
  abstract buscarTodos(): Promise<Organismo[]>;

  //asigna (o con null quita) el auditor; false si el organismo no existe
  abstract asignarAuditor(
    organismoId: number,
    auditorId: number | null,
  ): Promise<boolean>;

  //ids de los organismos que fiscaliza ese auditor
  abstract buscarIdsPorAuditor(auditorId: number): Promise<number[]>;

  abstract esAuditorDelOrganismo(
    auditorId: number,
    organismoId: number,
  ): Promise<boolean>;

  //devuelve false si no existe un organismo con ese id
  abstract activar(id: number): Promise<boolean>;

  abstract desactivar(id: number): Promise<boolean>;
}
