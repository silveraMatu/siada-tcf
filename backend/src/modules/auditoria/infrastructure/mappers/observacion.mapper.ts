import { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { ObservacionEntity } from '../entities/observaciones.entity.js';

export class ObservacionMapper {
  static toDomain(entity: ObservacionEntity): Observaciones {
    return new Observaciones(
      entity.cuentaMensualId,
      entity.codigoRegla,
      entity.tipo,
      entity.descripcion,
      entity.libroOrigen,
      entity.estado,
      entity.id,
      entity.transaccionId ?? undefined,
      entity.transaccionIngresoEgresoId ?? undefined,
    );
  }

  static toEntity(domain: Observaciones): ObservacionEntity {
    const entity = new ObservacionEntity();
    if (domain.id) entity.id = domain.id;
    entity.cuentaMensualId = domain.cuentaMensualId;
    entity.codigoRegla = domain.codigoRegla;
    entity.tipo = domain.tipo;
    entity.descripcion = domain.descripcion;
    entity.libroOrigen = domain.libroOrigen;
    entity.estado = domain.estado;
    entity.transaccionId = domain.transaccionId ?? null;
    entity.transaccionIngresoEgresoId =
      domain.transaccionIngresoEgresoId ?? null;
    return entity;
  }
}
