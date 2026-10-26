import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganismoRepositoryPort } from '../../../../application/ports/out/organismo-repository.port.js';
import { Organismo } from '../../../../domain/entities/organismo.domain.js';
import { OrganismoEntity } from '../../../entities/organismo.entity.js';

@Injectable()
export class TypeOrmOrganismoRepositoryAdapter implements OrganismoRepositoryPort {
  constructor(
    @InjectRepository(OrganismoEntity)
    private readonly repository: Repository<OrganismoEntity>,
  ) {}

  private toDomain(entity: OrganismoEntity): Organismo {
    return new Organismo(
      entity.nombre,
      entity.rubro,
      entity.active,
      entity.id,
      entity.fechaCreacion,
      entity.auditorId,
      entity.auditor
        ? {
            id: entity.auditor.id,
            nombre: entity.auditor.nombre,
            apellido: entity.auditor.apellido,
          }
        : null,
    );
  }

  async crear(organismo: Organismo): Promise<Organismo> {
    const entity = this.repository.create({
      nombre: organismo.nombre,
      rubro: organismo.rubro,
      active: organismo.active,
    });
    return this.toDomain(await this.repository.save(entity));
  }

  async buscarPorId(id: number): Promise<Organismo | null> {
    const entity = await this.repository
      .createQueryBuilder('o')
      .leftJoin('o.auditor', 'a')
      .addSelect(['a.id', 'a.nombre', 'a.apellido'])
      .where('o.id = :id', { id })
      .getOne();
    return entity ? this.toDomain(entity) : null;
  }

  async buscarTodos(): Promise<Organismo[]> {
    //columnas del auditor en lista blanca: nunca se trae su contraseña
    const entities = await this.repository
      .createQueryBuilder('o')
      .leftJoin('o.auditor', 'a')
      .addSelect(['a.id', 'a.nombre', 'a.apellido'])
      .orderBy('o.id', 'ASC')
      .getMany();
    return entities.map((entity) => this.toDomain(entity));
  }

  async asignarAuditor(
    organismoId: number,
    auditorId: number | null,
  ): Promise<boolean> {
    const { affected } = await this.repository.update(organismoId, {
      auditorId,
    });
    return !!affected;
  }

  async buscarIdsPorAuditor(auditorId: number): Promise<number[]> {
    const filas = await this.repository.find({
      select: { id: true },
      where: { auditorId },
      order: { id: 'ASC' },
    });
    return filas.map((fila) => fila.id);
  }

  async esAuditorDelOrganismo(
    auditorId: number,
    organismoId: number,
  ): Promise<boolean> {
    return await this.repository.exists({
      where: { id: organismoId, auditorId },
    });
  }

  async activar(id: number): Promise<boolean> {
    return this.cambiarEstado(id, true);
  }

  async desactivar(id: number): Promise<boolean> {
    return this.cambiarEstado(id, false);
  }

  private async cambiarEstado(id: number, active: boolean): Promise<boolean> {
    const { affected } = await this.repository.update(id, { active });
    return !!affected;
  }
}
