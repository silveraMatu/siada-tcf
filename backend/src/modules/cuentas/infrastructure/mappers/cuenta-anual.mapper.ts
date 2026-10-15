import { CuentaAnual } from "../../domain/entities/cuenta-anual.domain.js";
import { CuentaAnualEntity } from "../entities/cuenta-anual.entity.js";

export class CuentaAnualMapper {
  static toDomain(entity: CuentaAnualEntity): CuentaAnual {
    return new CuentaAnual(
      entity.id,
      entity.ejercicioFiscal,
      entity.organismoId,
      entity.fechaCreacion
    );
  }

  static toEntity(domain: CuentaAnual): CuentaAnualEntity {
    const entity = new CuentaAnualEntity();
    if (domain.id) entity.id = domain.id;
    entity.ejercicioFiscal = domain.ejercicioFiscal;
    entity.organismoId = domain.organismoId;
    return entity;

  }
}