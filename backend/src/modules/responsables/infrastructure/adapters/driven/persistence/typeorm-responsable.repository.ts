import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { ResponsableRepositoryPort } from '../../../../application/ports/out/responsable-repository.port.js';
import { Responsable } from '../../../../domain/entities/responsable.domain.js';
import { ResponsableEntity } from '../../../entities/responsable.entity.js';
import { ResponsableMapper } from '../../../mappers/responsable.mapper.js';

//codigo de Postgres para unique_violation
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class TypeOrmResponsableRepositoryAdapter implements ResponsableRepositoryPort {
  constructor(
    @InjectRepository(ResponsableEntity)
    private readonly repository: Repository<ResponsableEntity>,
  ) {}

  async crear(responsable: Responsable): Promise<Responsable> {
    try {
      const entity = await this.repository.save(
        ResponsableMapper.toEntity(responsable),
      );
      return ResponsableMapper.toDomain(entity);
    } catch (error) {
      //la restriccion unica cubre las solicitudes concurrentes
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictException(
          `El Usuario con ID ${responsable.usuarioId} ya tiene un Responsable asociado.`,
        );
      }
      throw error;
    }
  }

  async buscarPorId(id: number): Promise<Responsable | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? ResponsableMapper.toDomain(entity) : null;
  }

  async buscarPorUsuarioId(usuarioId: number): Promise<Responsable | null> {
    const entity = await this.repository.findOne({ where: { usuarioId } });
    return entity ? ResponsableMapper.toDomain(entity) : null;
  }

  async actualizar(
    id: number,
    datos: Partial<Responsable>,
  ): Promise<Responsable> {
    //id, usuarioId y fechaCreacion no se actualizan nunca
    const {
      id: _id,
      usuarioId: _usuarioId,
      fechaCreacion: _fechaCreacion,
      ...campos
    } = datos;
    await this.repository.update(id, campos);
    return ResponsableMapper.toDomain(
      await this.repository.findOneByOrFail({ id }),
    );
  }

  async listar(filtros?: { sinOrganismo?: boolean }): Promise<Responsable[]> {
    const consulta = this.repository
      .createQueryBuilder('responsable')
      .leftJoin('responsable.usuario', 'usuario')
      .addSelect([
        'usuario.id',
        'usuario.nombre',
        'usuario.apellido',
        'usuario.email',
      ])
      .orderBy('responsable.id', 'ASC');
    if (filtros?.sinOrganismo) {
      consulta.where('responsable.organismoId IS NULL');
    }
    const entities = await consulta.getMany();
    return entities.map((entity) => ResponsableMapper.toDomain(entity));
  }

  async buscarPorOrganismo(organismoId: number): Promise<Responsable[]> {
    const entities = await this.repository.find({
      where: { organismoId },
      order: { id: 'ASC' },
    });
    return entities.map((entity) => ResponsableMapper.toDomain(entity));
  }
}
