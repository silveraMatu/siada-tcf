import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UsuarioRepositoryPort } from '../../../../application/ports/out/usuario-repository.port.js';
import { Usuario } from '../../../../domain/entities/usuario.domain.js';
import { UsuarioEntity } from '../../../entities/usuario.entity.js';
import { UsuarioMapper } from '../../../mappers/usuario.mapper.js';

//codigo de Postgres para unique_violation
const UNIQUE_VIOLATION = '23505';

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

  async buscarPorCuitDni(cuitDni: string): Promise<Usuario | null> {
    const entity = await this.repository.findOne({ where: { cuitDni } });
    return entity ? UsuarioMapper.toDomain(entity) : null;
  }
}
