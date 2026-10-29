import { IngresosEgresos } from '../modules/ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import { TransaccionIngresoEgreso } from '../modules/ingresos-egresos/domain/entities/transaccion-ingreso-egreso.domain.js';
import { LibroBanco } from '../modules/libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../modules/libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { MotorAuditoriaService } from '../modules/auditoria/domain/engine/motor-auditoria.service.js';
import { CruceDepositosC4Rule } from '../modules/auditoria/domain/rules/cruce-ingresos-egresos-banco-depositos.rule.js';
import { CruceRetirosC5Rule } from '../modules/auditoria/domain/rules/cruce-ingresos-egresos-banco-retiros.rule.js';
import { CruceSaldoFinalC6Rule } from '../modules/auditoria/domain/rules/cruce-ingresos-egresos-banco-saldofinal.rule.js';
import { IngresosEgresosV1Rule } from '../modules/auditoria/domain/rules/ingresos-egresos-caja.rule.js';
import { IngresosEgresosV2Rule } from '../modules/auditoria/domain/rules/ingresos-egresos-banco.rule.js';
import { LibroBancoV3Rule } from '../modules/auditoria/domain/rules/libro-banco-saldo.rule.js';
import { EstadoValidacion } from '../modules/auditoria/domain/types/auditoria.types.js';
import { mesesDelSeed, type RendicionSeed } from './seed-datos.js';

const motor = new MotorAuditoriaService([
  new IngresosEgresosV1Rule(),
  new IngresosEgresosV2Rule(),
  new LibroBancoV3Rule(),
  new CruceDepositosC4Rule(),
  new CruceRetirosC5Rule(),
  new CruceSaldoFinalC6Rule(),
]);

//pasa los comandos del seed a dominio, con ids crecientes como los guarda la base
function auditar(rendicion: RendicionSeed) {
  let id = 1;
  const librosBanco = rendicion.librosBanco.map(
    (libro, posicion) =>
      new LibroBanco(
        1,
        libro.numeroCuentaCte,
        libro.transacciones.map(
          (t) =>
            new TransaccionLibroBanco(
              t.fecha ?? null,
              t.cheque ?? null,
              t.aLaOrdenDe,
              t.depositos,
              t.retiro,
              t.saldo,
              id++,
            ),
        ),
        posicion + 1,
      ),
  );
  const ingresosEgresos = new IngresosEgresos(
    1,
    rendicion.ingresosEgresos.numeroCuentaCte ?? null,
    rendicion.ingresosEgresos.transacciones.map(
      (t) =>
        new TransaccionIngresoEgreso({
          ...t,
          cheque: t.cheque ?? null,
          comprobante: t.comprobante ?? null,
          cuentasVariasConcepto: t.cuentasVariasConcepto ?? null,
          id: id++,
        }),
    ),
    1,
  );
  const resultados = motor.ejecutarAuditoriaCompleta({
    cuentaMensualId: 1,
    librosBanco,
    ingresosEgresos,
  });
  return Object.fromEntries(resultados.map((r) => [r.codigoRegla, r]));
}

describe('datos del seed', () => {
  const [borrador, cuadrado, conErrores] = mesesDelSeed();

  it.each([
    ['en borrador', borrador],
    ['presentada y cuadrada', cuadrado],
  ])('el mes %s pasa todas las reglas', (_nombre, mes) => {
    const resultados = auditar(mes.rendicion);
    expect(Object.keys(resultados)).toHaveLength(6);
    for (const resultado of Object.values(resultados)) {
      expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
      expect(resultado.observaciones).toEqual([]);
    }
  });

  it('el mes con errores falla solo en V3 (la fila alterada y la siguiente) y en V1 (una fila)', () => {
    const r = auditar(conErrores.rendicion);
    expect(r.V1.estado).toBe(EstadoValidacion.FALLO);
    expect(r.V1.observaciones).toHaveLength(1);
    expect(r.V3.estado).toBe(EstadoValidacion.FALLO);
    expect(r.V3.observaciones).toHaveLength(2);
    for (const codigo of ['V2', 'C4', 'C5', 'C6']) {
      expect(r[codigo].estado).toBe(EstadoValidacion.VERIFICADO);
    }
  });

  it('el mes con dos libros banco los cruza contra un solo I/E', () => {
    expect(cuadrado.rendicion.librosBanco).toHaveLength(2);
    expect(
      new Set(cuadrado.rendicion.librosBanco.map((l) => l.numeroCuentaCte))
        .size,
    ).toBe(2);
  });

  it('los importes tienen a lo sumo dos decimales y respetan los topes de la base', () => {
    for (const mes of mesesDelSeed()) {
      const importes = [
        ...mes.rendicion.librosBanco.flatMap((l) =>
          l.transacciones.flatMap((t) => [t.depositos, t.retiro, t.saldo]),
        ),
        ...mes.rendicion.ingresosEgresos.transacciones.flatMap((t) => [
          t.cajaDebe,
          t.cajaHaber,
          t.cajaSaldo,
          t.bancoDebe,
          t.bancoHaber,
          t.bancoSaldo,
        ]),
      ];
      for (const importe of importes) {
        expect(Math.round(importe * 100) / 100).toBe(importe);
        expect(Math.abs(importe)).toBeLessThanOrEqual(999_999_999_999.99);
      }
    }
  });
});
