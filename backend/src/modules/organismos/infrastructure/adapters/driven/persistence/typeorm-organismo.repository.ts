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
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async buscarTodos(): Promise<Organismo[]> {
    const entities = await this.repository.find({order: { id: 'ASC' } });
    return entities.map((entity) => this.toDomain(entity));
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
