import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { Rai } from '../../domain/entities/rai.domain.js';
import { TransaccionRai } from '../../domain/entities/transaccion-rai.domain.js';
import { RaiEntity } from '../entities/rai.entity.js';
import { TransaccionRaiEntity } from '../entities/transaccion-rai.entity.js';

export class RaiMapper {
  static toDomain(
    entity: RaiEntity,
    subidoPor: ResumenPersona | null = null,
  ): Rai {
    const transacciones = (entity.transacciones ?? []).map(
      (t) =>
        new TransaccionRai({
          id: t.id,
          asiento: t.asiento,
          fecha: t.fecha,
          planillaNumero: t.planillaNumero,
          concepto: t.concepto,
          ingresosDiarios: Number(t.ingresosDiarios),
          ingresosMensuales: Number(t.ingresosMensuales),
          ingresosAcumulados: Number(t.ingresosAcumulados),
          saldo: Number(t.saldo),
        }),
    );

    return new Rai(
      entity.cuentaMensualId,
      transacciones,
      entity.id,
      entity.fechaCreacion,
      entity.subidoPorId,
      entity.hashContenido,
      subidoPor,
    );
  }

  //solo la cabecera: los asientos se insertan aparte, por lotes (ver toTransaccionEntity)
  static toCabeceraEntity(domain: Rai): RaiEntity {
    const entity = new RaiEntity();
    if (domain.id) entity.id = domain.id;
    entity.cuentaMensualId = domain.cuentaMensualId;
    entity.subidoPorId = domain.subidoPorId!;
    entity.hashContenido = domain.hashContenido!;
    return entity;
  }

  static toTransaccionEntity(
    domain: TransaccionRai,
    raiId: number,
  ): TransaccionRaiEntity {
    const entity = new TransaccionRaiEntity();
    entity.raiId = raiId;
    entity.asiento = domain.asiento;
    entity.fecha = domain.fecha;
    entity.planillaNumero = domain.planillaNumero;
    entity.concepto = domain.concepto;
    entity.ingresosDiarios = domain.ingresosDiarios;
    entity.ingresosMensuales = domain.ingresosMensuales;
    entity.ingresosAcumulados = domain.ingresosAcumulados;
    entity.saldo = domain.saldo;
    return entity;
  }
}
