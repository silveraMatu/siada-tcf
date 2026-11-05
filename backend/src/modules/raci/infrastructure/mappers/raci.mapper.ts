import type { ResumenPersona } from '../../../../common/resumen-persona.js';
import { Raci } from '../../domain/entities/raci.domain.js';
import { TransaccionRaci } from '../../domain/entities/transaccion-raci.domain.js';
import { RaciEntity } from '../entities/raci.entity.js';
import { TransaccionRaciEntity } from '../entities/transaccion-raci.entity.js';

export class RaciMapper {
  static toDomain(
    entity: RaciEntity,
    subidoPor: ResumenPersona | null = null,
  ): Raci {
    const transacciones = (entity.transacciones ?? []).map(
      (t) =>
        new TransaccionRaci({
          id: t.id,
          asiento: t.asiento,
          fecha: t.fecha,
          expediente: t.expediente,
          concepto: t.concepto,
          compromisoInstrumentoLegal: t.compromisoInstrumentoLegal,
          compromisoDelMes: Number(t.compromisoDelMes),
          compromisoAcumulado: Number(t.compromisoAcumulado),
          compromisoOrdenProvision: t.compromisoOrdenProvision,
          devengadoDelMes: Number(t.devengadoDelMes),
          devengadoAcumulado: Number(t.devengadoAcumulado),
          devengadoSaldo: Number(t.devengadoSaldo),
          devengadoOrdenPago: t.devengadoOrdenPago,
          pagoNumeroCheque: t.pagoNumeroCheque,
          pagoDelMes: Number(t.pagoDelMes),
          pagoAcumulado: Number(t.pagoAcumulado),
          pagoSaldoAPagar: Number(t.pagoSaldoAPagar),
        }),
    );

    return new Raci(
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
  static toCabeceraEntity(domain: Raci): RaciEntity {
    const entity = new RaciEntity();
    if (domain.id) entity.id = domain.id;
    entity.cuentaMensualId = domain.cuentaMensualId;
    entity.subidoPorId = domain.subidoPorId!;
    entity.hashContenido = domain.hashContenido!;
    return entity;
  }

  static toTransaccionEntity(
    domain: TransaccionRaci,
    raciId: number,
  ): TransaccionRaciEntity {
    const entity = new TransaccionRaciEntity();
    entity.raciId = raciId;
    entity.asiento = domain.asiento;
    entity.fecha = domain.fecha;
    entity.expediente = domain.expediente;
    entity.concepto = domain.concepto;
    entity.compromisoInstrumentoLegal = domain.compromisoInstrumentoLegal;
    entity.compromisoDelMes = domain.compromisoDelMes;
    entity.compromisoAcumulado = domain.compromisoAcumulado;
    entity.compromisoOrdenProvision = domain.compromisoOrdenProvision;
    entity.devengadoDelMes = domain.devengadoDelMes;
    entity.devengadoAcumulado = domain.devengadoAcumulado;
    entity.devengadoSaldo = domain.devengadoSaldo;
    entity.devengadoOrdenPago = domain.devengadoOrdenPago;
    entity.pagoNumeroCheque = domain.pagoNumeroCheque;
    entity.pagoDelMes = domain.pagoDelMes;
    entity.pagoAcumulado = domain.pagoAcumulado;
    entity.pagoSaldoAPagar = domain.pagoSaldoAPagar;
    return entity;
  }
}
