import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { type FindOptionsSelect, QueryFailedError, Repository } from 'typeorm';
import {
  type CambiosAdministrativos,
  UsuarioRepositoryPort,
} from '../../../../application/ports/out/usuario-repository.port.js';
import {
  Usuario,
  type UsuarioSinPassword,
} from '../../../../domain/entities/usuario.domain.js';
import { UsuarioEntity } from '../../../entities/usuario.entity.js';
import { UsuarioMapper } from '../../../mappers/usuario.mapper.js';

//codigo de Postgres para unique_violation
const UNIQUE_VIOLATION = '23505';

//una columna nueva en la entidad queda excluida hasta agregarla aqui
const SELECT_SIN_PASSWORD: FindOptionsSelect<UsuarioEntity> = {
  id: true,
  nombre: true,
  apellido: true,
  dni: true,
  email: true,
  active: true,
  roles: true,
  fechaCreacion: true,
};

@Injectable()
export class TypeOrmUsuarioRepositoryAdapter implements UsuarioRepositoryPort {
  constructor(
    @InjectRepository(UsuarioEntity)
    private readonly repository: Repository<UsuarioEntity>,
  ) {}

  async crear(usuario: Usuario): Promise<Usuario> {
    try {
      const entity = await this.repository.save(
        UsuarioMapper.toEntity(usuario),
      );
      return UsuarioMapper.toDomain(entity);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string })?.code === UNIQUE_VIOLATION
      ) {
        //mensaje genérico
        throw new ConflictException(
          'No se pudo completar el registro con los datos ingresados.',
        );
      }
      throw error;
    }
  }

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const entity = await this.repository.findOne({ where: { email } });
    return entity ? UsuarioMapper.toDomain(entity) : null;
  }

  async buscarPorDni(dni: string): Promise<Usuario | null> {
    const entity = await this.repository.findOne({ where: { dni } });
    return entity ? UsuarioMapper.toDomain(entity) : null;
  }

  async buscarPorId(id: number): Promise<UsuarioSinPassword | null> {
    const entity = await this.repository.findOne({
      select: SELECT_SIN_PASSWORD,
      where: { id },
    });
    return entity ? UsuarioMapper.toDomainSinPassword(entity) : null;
  }

  async actualizar(
    id: number,
    datos: CambiosAdministrativos,
  ): Promise<UsuarioSinPassword> {
    await this.repository.update(id, datos);
    return UsuarioMapper.toDomainSinPassword(
      await this.repository.findOneOrFail({
        select: SELECT_SIN_PASSWORD,
        where: { id },
      }),
    );
  }

  async listar(filtros?: { active?: boolean }): Promise<UsuarioSinPassword[]> {
    const entities = await this.repository.find({
      select: SELECT_SIN_PASSWORD,
      //false tambien es un filtro valido
      where: filtros?.active === undefined ? {} : { active: filtros.active },
      order: { id: 'ASC' },
    });
    return entities.map((entity) => UsuarioMapper.toDomainSinPassword(entity));
  }
}
