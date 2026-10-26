import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { Observaciones } from '../../domain/entities/observaciones.domain.js';
import { ObservacionEntity } from '../entities/observaciones.entity.js';

export class ObservacionMapper {
  static toDomain(
    entity: ObservacionEntity,
    revisadaPor: ResumenPersona | null = null,
  ): Observaciones {
    return new Observaciones({
      id: entity.id,
      ejecucionId: entity.ejecucionId,
      cuentaMensualId: entity.cuentaMensualId,
      codigoRegla: entity.codigoRegla,
      tipo: entity.tipo,
      descripcion: entity.descripcion,
      libroOrigen: entity.libroOrigen,
      estado: entity.estado,
      transaccionId: entity.transaccionId ?? undefined,
      transaccionIngresoEgresoId:
        entity.transaccionIngresoEgresoId ?? undefined,
      valorInformado: entity.valorInformado ?? undefined,
      valorCalculado: entity.valorCalculado ?? undefined,
      diferencia: entity.diferencia ?? undefined,
      motivoDescarte: entity.motivoDescarte ?? undefined,
      revisadaPorId: entity.revisadaPorId ?? undefined,
      revisadaEn: entity.revisadaEn ?? undefined,
      revisadaPor,
    });
  }

  //la ejecución se informa aparte: las observaciones se guardan siempre dentro de una
  static toEntity(
    domain: Observaciones,
    ejecucionId: number,
  ): ObservacionEntity {
    const entity = new ObservacionEntity();
    if (domain.id) entity.id = domain.id;
    entity.ejecucionId = ejecucionId;
    entity.cuentaMensualId = domain.cuentaMensualId;
    entity.codigoRegla = domain.codigoRegla;
    entity.tipo = domain.tipo;
    entity.descripcion = domain.descripcion;
    entity.libroOrigen = domain.libroOrigen;
    entity.estado = domain.estado;
    entity.transaccionId = domain.transaccionId ?? null;
    entity.transaccionIngresoEgresoId =
      domain.transaccionIngresoEgresoId ?? null;
    entity.valorInformado = domain.valorInformado ?? null;
    entity.valorCalculado = domain.valorCalculado ?? null;
    entity.diferencia = domain.diferencia ?? null;
    entity.motivoDescarte = domain.motivoDescarte ?? null;
    entity.revisadaPorId = domain.revisadaPorId ?? null;
    entity.revisadaEn = domain.revisadaEn ?? null;
    return entity;
  }
}
