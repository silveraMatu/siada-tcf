import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ObservacionRepositoryPort } from '../../../../application/ports/out/observacion-repository.port.js';
import { Observaciones } from '../../../../domain/entities/observaciones.domain.js';
import { ObservacionEntity } from '../../../entities/observaciones.entity.js';
import { ObservacionMapper } from '../../../mappers/observacion.mapper.js';

//cada fila usa 8 parámetros y Postgres admite 65535 por consulta
const TAMANO_LOTE = 1000;

//misma identidad que los índices únicos de la tabla
const claveHallazgo = (o: {
  cuentaMensualId: number;
  codigoRegla: string;
  transaccionId?: number | null;
  transaccionIngresoEgresoId?: number | null;
}): string =>
  `${o.cuentaMensualId}|${o.codigoRegla}|${o.transaccionId ?? ''}|${o.transaccionIngresoEgresoId ?? ''}`;

@Injectable()
export class TypeOrmObservacionRepositoryAdapter implements ObservacionRepositoryPort {
  constructor(
    @InjectRepository(ObservacionEntity)
    private readonly repository: Repository<ObservacionEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async guardarVarias(
    observaciones: Observaciones[],
  ): Promise<Observaciones[]> {
    if (observaciones.length === 0) return [];

    const entities = observaciones.map((o) => ObservacionMapper.toEntity(o));

    //orIgnore: re-ejecutar la auditoría no duplica hallazgos (índices únicos parciales)
    await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < entities.length; i += TAMANO_LOTE) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(ObservacionEntity)
          .values(entities.slice(i, i + TAMANO_LOTE))
          .orIgnore()
          .execute();
      }
    });

    //las ya existentes no devuelven id al insertar: se relee lo persistido
    const claves = new Set(entities.map(claveHallazgo));
    const persistidas = await this.repository.find({
      where: {
        cuentaMensualId: In([
          ...new Set(entities.map((e) => e.cuentaMensualId)),
        ]),
        codigoRegla: In([...new Set(entities.map((e) => e.codigoRegla))]),
      },
      order: { id: 'ASC' },
    });

    return persistidas
      .filter((e) => claves.has(claveHallazgo(e)))
      .map((e) => ObservacionMapper.toDomain(e));
  }

  async obtenerPorCuentaMensual(
    cuentaMensualId: number,
  ): Promise<Observaciones[]> {
    const entities = await this.repository.find({
      where: { cuentaMensualId },
      order: { id: 'ASC' },
    });
    return entities.map((e) => ObservacionMapper.toDomain(e));
  }
}
