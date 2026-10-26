import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import {
  EjecucionAuditoriaRepositoryPort,
  type EjecucionGuardada,
} from '../../../../application/ports/out/ejecucion-auditoria-repository.port.js';
import type { EjecucionAuditoria } from '../../../../domain/entities/ejecucion-auditoria.domain.js';
import type { Observaciones } from '../../../../domain/entities/observaciones.domain.js';
import { EjecucionAuditoriaEntity } from '../../../entities/ejecucion-auditoria.entity.js';
import { ObservacionEntity } from '../../../entities/observaciones.entity.js';
import { EjecucionAuditoriaMapper } from '../../../mappers/ejecucion-auditoria.mapper.js';
import { ObservacionMapper } from '../../../mappers/observacion.mapper.js';

//cada observación usa 17 parámetros y Postgres admite 65535 por consulta
const TAMANO_LOTE = 1000;

@Injectable()
export class TypeOrmEjecucionAuditoriaRepositoryAdapter implements EjecucionAuditoriaRepositoryPort {
  constructor(
    @InjectRepository(EjecucionAuditoriaEntity)
    private readonly repository: Repository<EjecucionAuditoriaEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async guardar(
    ejecucion: EjecucionAuditoria,
    observaciones: Observaciones[],
  ): Promise<EjecucionGuardada> {
    return await this.dataSource.transaction(async (manager) => {
      //ON CONFLICT DO NOTHING sobre (rendición, versión): si otra petición se adelantó no devuelve ninguna fila
      const insertada = await manager
        .createQueryBuilder()
        .insert()
        .into(EjecucionAuditoriaEntity)
        .values({
          cuentaMensualId: ejecucion.cuentaMensualId,
          versionReglas: ejecucion.versionReglas,
          ejecutadaPorId: ejecucion.ejecutadaPorId,
          resultados: ejecucion.resultados,
        })
        .orIgnore()
        .returning('id')
        .execute();
      const filas = insertada.raw as { id: number }[];

      if (filas.length === 0) {
        const existente = await manager.findOneByOrFail(
          EjecucionAuditoriaEntity,
          {
            cuentaMensualId: ejecucion.cuentaMensualId,
            versionReglas: ejecucion.versionReglas,
          },
        );
        const previas = await manager.find(ObservacionEntity, {
          where: { ejecucionId: existente.id },
          order: { id: 'ASC' },
        });
        return {
          ejecucion: EjecucionAuditoriaMapper.toDomain(existente),
          observaciones: previas.map((e) => ObservacionMapper.toDomain(e)),
          creada: false,
        };
      }

      const ejecucionId = filas[0].id;
      const entities = observaciones.map((o) =>
        ObservacionMapper.toEntity(o, ejecucionId),
      );
      for (let i = 0; i < entities.length; i += TAMANO_LOTE) {
        await manager.insert(
          ObservacionEntity,
          entities.slice(i, i + TAMANO_LOTE),
        );
      }

      //se relee para devolver los ids y las fechas que asignó la base
      const guardada = await manager.findOneByOrFail(EjecucionAuditoriaEntity, {
        id: ejecucionId,
      });
      const persistidas = await manager.find(ObservacionEntity, {
        where: { ejecucionId },
        order: { id: 'ASC' },
      });
      return {
        ejecucion: EjecucionAuditoriaMapper.toDomain(guardada),
        observaciones: persistidas.map((e) => ObservacionMapper.toDomain(e)),
        creada: true,
      };
    });
  }

  async buscarUltima(
    cuentaMensualId: number,
  ): Promise<EjecucionAuditoria | null> {
    const entity = await this.repository.findOne({
      where: { cuentaMensualId },
      order: { id: 'DESC' },
    });
    return entity ? EjecucionAuditoriaMapper.toDomain(entity) : null;
  }

  async cerrar(
    ejecucionId: number,
    cierre: { cerradaPorId: number; conclusion: string; estadoFinal: string },
  ): Promise<boolean> {
    const resultado = await this.repository.update(
      { id: ejecucionId, cerradaEn: IsNull() },
      {
        cerradaPorId: cierre.cerradaPorId,
        conclusion: cierre.conclusion,
        estadoFinal: cierre.estadoFinal,
        cerradaEn: new Date(),
      },
    );
    return resultado.affected === 1;
  }
}
