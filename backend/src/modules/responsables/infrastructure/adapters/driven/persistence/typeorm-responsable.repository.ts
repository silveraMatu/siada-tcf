import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponsableRepositoryPort } from '../../../../application/ports/out/responsable-repository.port.js';
import { Responsable } from '../../../../domain/entities/responsable.domain.js';
import { ResponsableEntity } from '../../../entities/responsable.entity.js';
import { ResponsableMapper } from '../../../mappers/responsable.mapper.js';

@Injectable()
export class TypeOrmResponsableRepositoryAdapter implements ResponsableRepositoryPort {
  constructor(
    @InjectRepository(ResponsableEntity)
    private readonly repository: Repository<ResponsableEntity>,
  ) {}

  async crear(responsable: Responsable): Promise<Responsable> {
    const entity = await this.repository.save(
      ResponsableMapper.toEntity(responsable),
    );
    return ResponsableMapper.toDomain(entity);
  }

  async buscarPorId(id: number): Promise<Responsable | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ResponsableMapper.toDomain(entity) : null;
  }

  async actualizar(id: number, datos: Partial<Responsable>): Promise<Responsable> {
    const { id: _id, fechaCreacion: _fechaCreacion, ...campos } = datos;
    await this.repository.update(id, campos);
    return ResponsableMapper.toDomain(await this.repository.findOneByOrFail({ id }));
  }

  async buscarPorOrganismo(organismoId: number): Promise<Responsable[]> {
    const entities = await this.repository.find({
      where: { organismoId },
      order: { id: 'ASC' },
    });
    return entities.map((entity) => ResponsableMapper.toDomain(entity));
  }
}
