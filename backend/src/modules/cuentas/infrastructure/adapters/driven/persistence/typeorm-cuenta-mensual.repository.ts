import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CuentaMensualRepositoryPort } from '../../../../application/ports/out/cuenta-mensual-repository.port.js';
import { CuentaMensual } from '../../../../domain/entities/cuenta-mensual.domain.js';
import { CuentaMensualListada } from '../../../../domain/entities/cuenta-mensual-listada.domain.js';
import { EstadoCuentaMensual } from '../../../../domain/enums/estado-cuenta-mensual.enum.js';
import { LibroBancoEntity } from '../../../../../libro-banco/infrastructure/entities/libro-banco.entity.js';
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

  async tieneLibros(id: number): Promise<boolean> {
    return await this.repository.manager.exists(LibroBancoEntity, {
      where: { cuentaMensualId: id },
    });
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
  }): Promise<CuentaMensualListada[]> {
    //columnas en lista blanca: solo lo que necesita el listado, sin traer la entidad del organismo completa
    const consulta = this.repository
      .createQueryBuilder('cm')
      .innerJoin('cm.cuentaAnual', 'ca')
      .innerJoin('ca.organismo', 'o')
      .select('cm.id', 'id')
      .addSelect('cm.mes', 'mes')
      .addSelect('cm.cuentaAnualId', 'cuentaAnualId')
      .addSelect('cm.estado', 'estado')
      .addSelect('cm.fechaCreacion', 'fechaCreacion')
      .addSelect('ca.organismoId', 'organismoId')
      .addSelect('o.nombre', 'organismoNombre')
      .addSelect('ca.ejercicioFiscal', 'ejercicioFiscal')
      .orderBy('cm.id', 'ASC');
    if (filtros?.estado)
      consulta.where('cm.estado = :estado', { estado: filtros.estado });

    const filas = await consulta.getRawMany<{
      id: number;
      mes: number;
      cuentaAnualId: number;
      estado: EstadoCuentaMensual;
      fechaCreacion: Date;
      organismoId: number;
      organismoNombre: string;
      ejercicioFiscal: number;
    }>();
    return filas.map(
      (fila) =>
        new CuentaMensualListada(
          fila.id,
          fila.mes,
          fila.cuentaAnualId,
          fila.estado,
          fila.fechaCreacion,
          fila.organismoId,
          fila.organismoNombre,
          fila.ejercicioFiscal,
        ),
    );
  }
}
