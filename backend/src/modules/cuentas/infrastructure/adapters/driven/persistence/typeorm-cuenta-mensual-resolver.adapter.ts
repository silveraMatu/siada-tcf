import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CuentaMensualResolverPort } from '../../../../application/ports/out/cuenta-mensual-resolver.port.js';
import { CuentaMensual } from '../../../../domain/entities/cuenta-mensual.domain.js';
import { CuentaAnualEntity } from '../../../entities/cuenta-anual.entity.js';
import { CuentaMensualEntity } from '../../../entities/cuenta-mensual.entity.js';
import { CuentaMensualMapper } from '../../../mappers/cuenta-mensual.mapper.js';

@Injectable()
export class TypeOrmCuentaMensualResolverAdapter implements CuentaMensualResolverPort {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async resolver(
    organismoId: number,
    ejercicioFiscal: number,
    mes: number,
  ): Promise<CuentaMensual> {
    return await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(CuentaAnualEntity)
        .values({ organismoId, ejercicioFiscal })
        .orIgnore()
        .execute();

      const cuentaAnual = await manager.findOneByOrFail(CuentaAnualEntity, {
        organismoId,
        ejercicioFiscal,
      });

      await manager
        .createQueryBuilder()
        .insert()
        .into(CuentaMensualEntity)
        .values({ cuentaAnualId: cuentaAnual.id, mes })
        .orIgnore()
        .execute();

      const cuentaMensual = await manager.findOneByOrFail(CuentaMensualEntity, {
        cuentaAnualId: cuentaAnual.id,
        mes,
      });

      return CuentaMensualMapper.toDomain(cuentaMensual);
    });
  }
}
