import { IngresosEgresos } from '../modules/ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import { TransaccionIngresoEgreso } from '../modules/ingresos-egresos/domain/entities/transaccion-ingreso-egreso.domain.js';
import { LibroBanco } from '../modules/libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../modules/libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { MotorAuditoriaService } from '../modules/auditoria/domain/engine/motor-auditoria.service.js';
import { crearReglasAuditoria } from '../modules/auditoria/domain/engine/reglas-auditoria.js';
import { EstadoValidacion } from '../modules/auditoria/domain/types/auditoria.types.js';
import { Raci } from '../modules/raci/domain/entities/raci.domain.js';
import { TransaccionRaci } from '../modules/raci/domain/entities/transaccion-raci.domain.js';
import {
  EJERCICIO_SEED,
  mesesDelSeed,
  type RendicionSeed,
} from './seed-datos.js';

//las mismas reglas, en el mismo orden, que registra el módulo de auditoría
const motor = new MotorAuditoriaService(crearReglasAuditoria());

//pasa los comandos del seed a dominio, con ids crecientes como los guarda la base
function auditar(rendicion: RendicionSeed, mes: number) {
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
  const raci = new Raci(
    1,
    rendicion.raci.transacciones.map(
      (t) =>
        new TransaccionRaci({
          ...t,
          expediente: t.expediente ?? null,
          compromisoInstrumentoLegal: t.compromisoInstrumentoLegal ?? null,
          compromisoOrdenProvision: t.compromisoOrdenProvision ?? null,
          devengadoOrdenPago: t.devengadoOrdenPago ?? null,
          pagoNumeroCheque: t.pagoNumeroCheque ?? null,
          id: id++,
        }),
    ),
    1,
  );
  const resultados = motor.ejecutarAuditoriaCompleta({
    cuentaMensualId: 1,
    librosBanco,
    ingresosEgresos,
    raci,
    periodo: { ejercicioFiscal: EJERCICIO_SEED, mes },
  });
  return Object.fromEntries(resultados.map((r) => [r.codigoRegla, r]));
}

describe('datos del seed', () => {
  const [borrador, cuadrado, conErrores] = mesesDelSeed();

  it.each([
    ['en borrador', borrador],
    ['presentada y cuadrada', cuadrado],
  ])('el mes %s pasa las 14 reglas', (_nombre, mes) => {
    const resultados = auditar(mes.rendicion, mes.mes);
    expect(Object.keys(resultados)).toEqual([
      'V1',
      'V2',
      'V3',
      'V4',
      'V5',
      'V6',
      'C1',
      'C2',
      'C4',
      'C5',
      'C6',
      'P1',
      'P2',
      'F1',
    ]);
    for (const resultado of Object.values(resultados)) {
      expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
      expect(resultado.observaciones).toEqual([]);
    }
  });

  it('el mes con errores falla solo donde se sembró el error', () => {
    const r = auditar(conErrores.rendicion, conErrores.mes);
    const fallan = Object.values(r)
      .filter((x) => x.estado === EstadoValidacion.FALLO)
      .map((x) => x.codigoRegla);

    expect(fallan).toEqual(['V1', 'V3', 'P1', 'F1']);
    //V3 marca la fila alterada y la siguiente (parte del saldo informado); el resto, una sola fila
    expect(r.V1.observaciones).toHaveLength(1);
    expect(r.V3.observaciones).toHaveLength(2);
    expect(r.P1.observaciones).toHaveLength(1);
    expect(r.F1.observaciones).toHaveLength(1);
    expect(r.P1.observaciones[0].transaccionRaciId).toBeDefined();
    expect(r.F1.observaciones[0].transaccionRaciId).toBeDefined();
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

  describe('RACI', () => {
    const centavos = (importe: number) => Math.round(importe * 100);

    it.each(mesesDelSeed().map((mes) => [`mes ${mes.mes}`, mes] as const))(
      'el RACI del %s cumple las fórmulas de la planilla en cada asiento',
      (_nombre, mes) => {
        const [base, ...resto] = mes.rendicion.raci.transacciones;
        //la primera fila es la base: sin importes del mes y con el acumulado de los meses anteriores
        expect(base).toMatchObject({
          compromisoDelMes: 0,
          devengadoDelMes: 0,
          pagoDelMes: 0,
        });

        let anterior = base;
        for (const t of resto) {
          //acumulado = acumulado de la fila anterior + del mes
          expect(centavos(t.compromisoAcumulado)).toBe(
            centavos(anterior.compromisoAcumulado) +
              centavos(t.compromisoDelMes),
          );
          expect(centavos(t.devengadoAcumulado)).toBe(
            centavos(anterior.devengadoAcumulado) + centavos(t.devengadoDelMes),
          );
          expect(centavos(t.pagoAcumulado)).toBe(
            centavos(anterior.pagoAcumulado) + centavos(t.pagoDelMes),
          );
          //saldo devengado = compromiso − devengado; saldo a pagar = devengado − pago (acumulados)
          expect(centavos(t.devengadoSaldo)).toBe(
            centavos(t.compromisoAcumulado) - centavos(t.devengadoAcumulado),
          );
          expect(centavos(t.pagoSaldoAPagar)).toBe(
            centavos(t.devengadoAcumulado) - centavos(t.pagoAcumulado),
          );
          anterior = t;
        }
      },
    );

    it.each(mesesDelSeed().map((mes) => [`mes ${mes.mes}`, mes] as const))(
      'el RACI del %s refleja todos los egresos del banco del mes',
      (_nombre, mes) => {
        const egresosBanco = mes.rendicion.librosBanco
          .flatMap((libro) => libro.transacciones)
          .reduce((suma, t) => suma + centavos(t.retiro), 0);
        const pagadoRaci = mes.rendicion.raci.transacciones.reduce(
          (suma, t) => suma + centavos(t.pagoDelMes),
          0,
        );
        const egresosIE = mes.rendicion.ingresosEgresos.transacciones.reduce(
          (suma, t) => suma + centavos(t.egresoInc1),
          0,
        );

        expect(pagadoRaci).toBe(egresosBanco);
        expect(pagadoRaci).toBe(egresosIE);
      },
    );

    it('el acumulado con el que abre cada mes es el total de egresos de los meses anteriores', () => {
      const [mes1, mes2, mes3] = mesesDelSeed();
      const pagado = (m: (typeof mes1)['rendicion']) =>
        m.raci.transacciones.reduce((s, t) => s + centavos(t.pagoDelMes), 0);

      expect(mes1.rendicion.raci.transacciones[0].pagoAcumulado).toBe(0);
      expect(centavos(mes2.rendicion.raci.transacciones[0].pagoAcumulado)).toBe(
        pagado(mes1.rendicion),
      );
      expect(centavos(mes3.rendicion.raci.transacciones[0].pagoAcumulado)).toBe(
        pagado(mes1.rendicion) + pagado(mes2.rendicion),
      );
    });
  });
});
