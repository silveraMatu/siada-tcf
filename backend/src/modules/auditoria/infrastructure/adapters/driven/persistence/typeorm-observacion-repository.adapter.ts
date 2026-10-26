import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ObservacionRepositoryPort,
  type CambiosRevision,
  type ConteoObservaciones,
} from '../../../../application/ports/out/observacion-repository.port.js';
import type { Observaciones } from '../../../../domain/entities/observaciones.domain.js';
import { EstadoObservacion } from '../../../../domain/rules/validations.js';
import { ObservacionEntity } from '../../../entities/observaciones.entity.js';
import { observacionesADominio } from '../../../mappers/cargar-dominio.js';

@Injectable()
export class TypeOrmObservacionRepositoryAdapter implements ObservacionRepositoryPort {
  constructor(
    @InjectRepository(ObservacionEntity)
    private readonly repository: Repository<ObservacionEntity>,
  ) {}

  async buscarPorId(id: number): Promise<Observaciones | null> {
    const entity = await this.repository.findOneBy({ id });
    if (!entity) return null;
    const [observacion] = await observacionesADominio(this.repository.manager, [
      entity,
    ]);
    return observacion;
  }

  async revisar(id: number, cambios: CambiosRevision): Promise<Observaciones> {
    await this.repository.update(id, cambios);
    const [observacion] = await observacionesADominio(this.repository.manager, [
      await this.repository.findOneByOrFail({ id }),
    ]);
    return observacion;
  }

  async obtenerPorEjecucion(ejecucionId: number): Promise<Observaciones[]> {
    const entities = await this.repository.find({
      where: { ejecucionId },
      order: { id: 'ASC' },
    });
    return await observacionesADominio(this.repository.manager, entities);
  }

  async contarPorEstado(ejecucionId: number): Promise<ConteoObservaciones> {
    const filas = await this.repository
      .createQueryBuilder('o')
      .select('o.estado', 'estado')
      .addSelect('COUNT(*)', 'total')
      .where('o.ejecucionId = :ejecucionId', { ejecucionId })
      .groupBy('o.estado')
      .getRawMany<{ estado: EstadoObservacion; total: string }>();

    const conteo: ConteoObservaciones = {
      [EstadoObservacion.ABIERTA]: 0,
      [EstadoObservacion.CONFIRMADA]: 0,
      [EstadoObservacion.DESCARTADA]: 0,
    };
    for (const fila of filas) conteo[fila.estado] = Number(fila.total); //COUNT llega como texto
    return conteo;
  }
}
