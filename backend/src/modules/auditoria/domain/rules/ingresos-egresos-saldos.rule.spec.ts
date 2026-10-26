import { IngresosEgresos } from '../../../ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import {
  type DatosTransaccionIngresoEgreso,
  TransaccionIngresoEgreso,
} from '../../../ingresos-egresos/domain/entities/transaccion-ingreso-egreso.domain.js';
import { EstadoValidacion } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { IngresosEgresosV2Rule } from './ingresos-egresos-banco.rule.js';
import { IngresosEgresosV1Rule } from './ingresos-egresos-caja.rule.js';
import type { ReglaAuditoria } from './regla-auditoria.interface.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

type Columnas = 'caja' | 'banco';

//fila con saldos en cero salvo lo indicado; el id es el de la fila salvo que se pise
const tx = (fila: number, extra: Partial<DatosTransaccionIngresoEgreso> = {}) =>
  new TransaccionIngresoEgreso({
    fila,
    fecha: '2026-03-01',
    concepto: `Fila ${fila}`,
    cheque: null,
    comprobante: null,
    cajaDebe: 0,
    cajaHaber: 0,
    cajaSaldo: 0,
    bancoDebe: 0,
    bancoHaber: 0,
    bancoSaldo: 0,
    egresoInc1: 0,
    egresoInc2: 0,
    egresoInc3: 0,
    egresoInc4: 0,
    egresoInc5: 0,
    ingresoMunicipal: 0,
    ingresoOtras: 0,
    cuentasVariasConcepto: null,
    cuentasVariasDebe: 0,
    cuentasVariasHaber: 0,
    id: fila,
    ...extra,
  });

const contexto = (...transacciones: TransaccionIngresoEgreso[]) =>
  ({
    cuentaMensualId: 7,
    ingresosEgresos: new IngresosEgresos(7, null, transacciones, 1),
  }) satisfies AuditoriaContext;

//V1 y V2 son la misma fórmula sobre columnas distintas: se prueban con el mismo conjunto de casos
describe.each<[string, ReglaAuditoria, validationsCode, Columnas, Columnas]>([
  [
    'V1 (caja)',
    new IngresosEgresosV1Rule(),
    validationsCode.V1,
    'caja',
    'banco',
  ],
  [
    'V2 (banco)',
    new IngresosEgresosV2Rule(),
    validationsCode.V2,
    'banco',
    'caja',
  ],
])('%s', (_nombre, regla, codigo, columna, otra) => {
  const debe = `${columna}Debe` as 'cajaDebe' | 'bancoDebe';
  const haber = `${columna}Haber` as 'cajaHaber' | 'bancoHaber';
  const saldo = `${columna}Saldo` as 'cajaSaldo' | 'bancoSaldo';
  const saldoOtra = `${otra}Saldo` as 'cajaSaldo' | 'bancoSaldo';

  //fila con debe, haber y saldo de la columna que se controla
  const fila = (
    n: number,
    d: number,
    h: number,
    s: number,
    extra: Partial<DatosTransaccionIngresoEgreso> = {},
  ) => tx(n, { [debe]: d, [haber]: h, [saldo]: s, ...extra });
  const observar = (...transacciones: TransaccionIngresoEgreso[]) =>
    regla.execute(contexto(...transacciones)).observaciones;

  it('declara su código, su descripción y el libro que necesita', () => {
    expect(regla.codigo).toBe(codigo);
    expect(regla.descripcion).toEqual(expect.any(String));
    expect(regla.librosRequeridos).toEqual(['INGRESOS_EGRESOS']);
  });

  it('devuelve VERIFICADO sin observaciones si todos los saldos son consistentes', () => {
    const resultado = regla.execute(
      contexto(fila(1, 100, 0, 100), fila(2, 50, 0, 150), fila(3, 0, 30, 120)),
    );

    expect(resultado).toEqual({
      codigoRegla: codigo,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 2,
    });
  });

  it('filasEvaluadas cuenta las filas validadas: todas menos la primera, también las que fallan', () => {
    const conFallo = regla.execute(
      contexto(fila(1, 100, 0, 100), fila(2, 50, 0, 999), fila(3, 0, 1, 998)),
    );
    const unaFila = regla.execute(contexto(fila(1, 100, 0, 100)));
    const sinFilas = regla.execute(contexto());

    expect(conFallo.filasEvaluadas).toBe(2);
    expect(unaFila.filasEvaluadas).toBe(0);
    expect(sinFilas.filasEvaluadas).toBe(0);
  });

  it('marca la fila con saldo incorrecto: FALLO con todos los campos de la observación', () => {
    const resultado = regla.execute(
      contexto(fila(1, 100, 0, 100), fila(2, 50, 0, 160, { id: 55 })),
    );

    expect(resultado.estado).toBe(EstadoValidacion.FALLO);
    expect(resultado.codigoRegla).toBe(codigo);
    expect(resultado.observaciones).toHaveLength(1);
    const [obs] = resultado.observaciones;
    expect(obs.cuentaMensualId).toBe(7);
    expect(obs.codigoRegla).toBe(codigo);
    expect(obs.tipo).toBe(validationsType.INTERNA);
    expect(obs.libroOrigen).toBe(LibroOrigen.INGRESOS_EGRESOS);
    expect(obs.estado).toBe(EstadoObservacion.ABIERTA);
    expect(obs.transaccionIngresoEgresoId).toBe(55);
    expect(obs.transaccionId).toBeUndefined();
    expect(obs.descripcion).toBe(
      `Error de fórmula en la fila 2: el saldo de ${columna} calculado (150.00) no coincide con el saldo informado (160.00). Diferencia: 10.00.`,
    );
  });

  it('la primera fila es la base: su saldo no se valida', () => {
    //saldo arrastrado del mes anterior, sin debe ni haber que lo expliquen
    expect(observar(fila(1, 0, 0, 5000), fila(2, 100, 0, 5100))).toEqual([]);
  });

  it('no genera errores en cascada tras una fila incorrecta', () => {
    //la fila 2 está mal (debería ser 150); las siguientes son coherentes con el saldo informado
    const observaciones = observar(
      fila(1, 100, 0, 100),
      fila(2, 50, 0, 999),
      fila(3, 0, 99, 900),
    );

    expect(observaciones.map((o) => o.transaccionIngresoEgresoId)).toEqual([2]);
  });

  it('informa cada fila incorrecta con el número de fila del archivo', () => {
    const observaciones = observar(
      fila(10, 100, 0, 100),
      fila(11, 50, 0, 1),
      fila(12, 50, 0, 51),
      fila(13, 0, 10, 1),
    );

    expect(observaciones.map((o) => o.descripcion.slice(0, 33))).toEqual([
      'Error de fórmula en la fila 11: e',
      'Error de fórmula en la fila 13: e',
    ]);
  });

  it('ordena por número de fila aunque lleguen desordenadas o con ids al revés', () => {
    const resultado = observar(
      fila(3, 0, 30, 120, { id: 1 }),
      fila(1, 100, 0, 100, { id: 3 }),
      fila(2, 50, 0, 150, { id: 2 }),
    );

    expect(resultado).toEqual([]);
  });

  it('tolera hasta 0.01 de diferencia y marca desde 0.02', () => {
    expect(observar(fila(1, 0, 0, 100), fila(2, 10, 0, 110.01))).toEqual([]);
    expect(observar(fila(1, 0, 0, 100), fila(2, 10, 0, 110.02))).toHaveLength(
      1,
    );
  });

  it('no marca falsos positivos por coma flotante', () => {
    //0.1 + 0.2 = 0.30000000000000004 en coma flotante
    expect(observar(fila(1, 0.1, 0, 0.1), fila(2, 0.2, 0, 0.3))).toEqual([]);
  });

  it('acepta saldos negativos', () => {
    expect(observar(fila(1, 0, 0, -100), fila(2, 0, 50, -150))).toEqual([]);
  });

  it('con 1 fila no hay nada que validar', () => {
    expect(observar(fila(1, 100, 0, 5))).toEqual([]);
  });

  it('controla solo sus columnas: ignora el saldo de la otra', () => {
    const resultado = observar(
      fila(1, 100, 0, 100, { [saldoOtra]: 1 }),
      fila(2, 50, 0, 150, { [saldoOtra]: 999_999 }),
    );

    expect(resultado).toEqual([]);
  });

  it('sin libro en el contexto devuelve VERIFICADO sin hallazgos', () => {
    const resultado = regla.execute({ cuentaMensualId: 7 });

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
    expect(resultado.observaciones).toEqual([]);
    expect(resultado.filasEvaluadas).toBe(0);
  });

  it('no muta el arreglo de transacciones del libro', () => {
    const transacciones = [fila(2, 50, 0, 150), fila(1, 100, 0, 100)];

    observar(...transacciones);

    expect(transacciones.map((t) => t.fila)).toEqual([2, 1]);
  });
});
