import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LibroBancoRepositoryPort } from '../../../../application/ports/out/libro-banco-repository.port.js';
import { LibroBanco } from '../../../../domain/entities/libro-banco.domain.js';
import { LibroBancoEntity } from '../../../entities/libro-banco.entity.js';
import { LibroBancoMapper } from '../../../mappers/libro-banco.mapper.js';

@Injectable()
export class TypeOrmLibroBancoRepositoryAdapter implements LibroBancoRepositoryPort {
  constructor(
    @InjectRepository(LibroBancoEntity)
    private readonly repository: Repository<LibroBancoEntity>,
  ) {}

  async guardar(libroBanco: LibroBanco): Promise<LibroBanco> {
    const entity = LibroBancoMapper.toEntity(libroBanco);
    const guardado = await this.repository.save(entity);
    return LibroBancoMapper.toDomain(guardado);
  }

  async buscarPorCuentaMensualId(
    cuentaMensualId: number,
  ): Promise<LibroBanco[]> {
    const entities = await this.repository.find({
      where: { cuentaMensualId },
      relations: {
        transacciones: true,
      },
      order: { id: 'ASC' },
    });

    return entities.map((entity) => LibroBancoMapper.toDomain(entity));
  }
}
