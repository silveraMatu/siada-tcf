import { IngresosEgresos } from '../../domain/entities/ingresos-egresos.domain.js';
import { TransaccionIngresoEgreso } from '../../domain/entities/transaccion-ingreso-egreso.domain.js';
import { IngresosEgresosEntity } from '../entities/ingresos-egresos.entity.js';
import { TransaccionIngresoEgresoEntity } from '../entities/transaccion-ingreso-egreso.entity.js';

export class IngresosEgresosMapper {
  static toDomain(entity: IngresosEgresosEntity): IngresosEgresos {
    const transacciones = (entity.transacciones ?? []).map(
      (t) =>
        new TransaccionIngresoEgreso({
          id: t.id,
          fila: t.fila,
          fecha: t.fecha,
          concepto: t.concepto,
          cheque: t.cheque,
          comprobante: t.comprobante,
          cajaDebe: Number(t.cajaDebe),
          cajaHaber: Number(t.cajaHaber),
          cajaSaldo: Number(t.cajaSaldo),
          bancoDebe: Number(t.bancoDebe),
          bancoHaber: Number(t.bancoHaber),
          bancoSaldo: Number(t.bancoSaldo),
          egresoInc1: Number(t.egresoInc1),
          egresoInc2: Number(t.egresoInc2),
          egresoInc3: Number(t.egresoInc3),
          egresoInc4: Number(t.egresoInc4),
          egresoInc5: Number(t.egresoInc5),
          ingresoMunicipal: Number(t.ingresoMunicipal),
          ingresoOtras: Number(t.ingresoOtras),
          cuentasVariasConcepto: t.cuentasVariasConcepto,
          cuentasVariasDebe: Number(t.cuentasVariasDebe),
          cuentasVariasHaber: Number(t.cuentasVariasHaber),
        }),
    );

    return new IngresosEgresos(
      entity.cuentaMensualId,
      entity.numeroCuentaCte,
      transacciones,
      entity.id,
      entity.fechaCreacion,
    );
  }

  //solo la cabecera: las filas se insertan aparte, por lotes (ver toTransaccionEntity)
  static toCabeceraEntity(domain: IngresosEgresos): IngresosEgresosEntity {
    const entity = new IngresosEgresosEntity();
    if (domain.id) entity.id = domain.id;
    entity.cuentaMensualId = domain.cuentaMensualId;
    entity.numeroCuentaCte = domain.numeroCuentaCte;
    return entity;
  }

  static toTransaccionEntity(
    domain: TransaccionIngresoEgreso,
    ingresosEgresosId: number,
  ): TransaccionIngresoEgresoEntity {
    const entity = new TransaccionIngresoEgresoEntity();
    entity.ingresosEgresosId = ingresosEgresosId;
    entity.fila = domain.fila;
    entity.fecha = domain.fecha;
    entity.concepto = domain.concepto;
    entity.cheque = domain.cheque;
    entity.comprobante = domain.comprobante;
    entity.cajaDebe = domain.cajaDebe;
    entity.cajaHaber = domain.cajaHaber;
    entity.cajaSaldo = domain.cajaSaldo;
    entity.bancoDebe = domain.bancoDebe;
    entity.bancoHaber = domain.bancoHaber;
    entity.bancoSaldo = domain.bancoSaldo;
    entity.egresoInc1 = domain.egresoInc1;
    entity.egresoInc2 = domain.egresoInc2;
    entity.egresoInc3 = domain.egresoInc3;
    entity.egresoInc4 = domain.egresoInc4;
    entity.egresoInc5 = domain.egresoInc5;
    entity.ingresoMunicipal = domain.ingresoMunicipal;
    entity.ingresoOtras = domain.ingresoOtras;
    entity.cuentasVariasConcepto = domain.cuentasVariasConcepto;
    entity.cuentasVariasDebe = domain.cuentasVariasDebe;
    entity.cuentasVariasHaber = domain.cuentasVariasHaber;
    return entity;
  }
}
