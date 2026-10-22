import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaMensualRepositoryPort } from '../../../../application/ports/out/cuenta-mensual-repository.port.js';
import { CuentaMensual } from '../../../../domain/entities/cuenta-mensual.domain.js';
import { EstadoCuentaMensual } from '../../../../domain/enums/estado-cuenta-mensual.enum.js';
import { CuentaMensualEntity } from '../../../entities/cuenta-mensual.entity.js';
import { CuentaMensualMapper } from '../../../mappers/cuenta-mensual.mapper.js';

@Injectable()
export class TypeOrmCuentaMensualRepositoryAdapter implements CuentaMensualRepositoryPort {
  constructor(
    @InjectRepository(CuentaMensualEntity)
    private readonly repository: Repository<CuentaMensualEntity>,
  ) {}

  async existe(id: number): Promise<boolean> {
    return await this.repository.exists({ where: { id } });
  }

  async buscarPorId(id: number): Promise<CuentaMensual | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? CuentaMensualMapper.toDomain(entity) : null;
  }

  async obtenerOrganismoId(id: number): Promise<number | null> {
    const fila = await this.repository
      .createQueryBuilder('cm')
      .innerJoin('cm.cuentaAnual', 'ca')
      .select('ca.organismoId', 'organismoId')
      .where('cm.id = :id', { id })
      .getRawOne<{ organismoId: number }>();
    return fila ? fila.organismoId : null;
  }

  async cambiarEstado(
    id: number,
    desde: EstadoCuentaMensual,
    hacia: EstadoCuentaMensual,
  ): Promise<boolean> {
    const resultado = await this.repository.update(
      { id, estado: desde },
      { estado: hacia },
    );
    return resultado.affected === 1;
  }

  async listar(filtros?: {
    estado?: EstadoCuentaMensual;
  }): Promise<CuentaMensual[]> {
    const entities = await this.repository.find({
      where: filtros?.estado ? { estado: filtros.estado } : {},
      order: { id: 'ASC' },
    });
    return entities.map((entity) => CuentaMensualMapper.toDomain(entity));
  }
}
