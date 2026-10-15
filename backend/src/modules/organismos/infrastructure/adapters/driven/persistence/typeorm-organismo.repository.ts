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
    return new Organismo(entity.id, entity.nombre, entity.rubro, entity.active, entity.fechaCreacion);
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

  async activar(id: number): Promise<void> {
    await this.repository.update(id, { active: true });
  }

  async desactivar(id: number): Promise<void> {
    await this.repository.update(id, { active: false });
  }
}
