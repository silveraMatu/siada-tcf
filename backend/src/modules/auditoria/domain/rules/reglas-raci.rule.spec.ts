import { IngresosEgresos } from '../../../ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import { TransaccionIngresoEgreso } from '../../../ingresos-egresos/domain/entities/transaccion-ingreso-egreso.domain.js';
import { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../../libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { Raci } from '../../../raci/domain/entities/raci.domain.js';
import {
  TransaccionRaci,
  type DatosTransaccionRaci,
} from '../../../raci/domain/entities/transaccion-raci.domain.js';
import { EstadoValidacion } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { ChequeExistenciaP1Rule } from './cheque-existencia.rule.js';
import { ChequeMontoP2Rule } from './cheque-monto.rule.js';
import { CruceDevengadoC1Rule } from './cruce-raci-ingresos-egresos-devengado.rule.js';
import { CrucePagadoC2Rule } from './cruce-raci-ingresos-egresos-pagado.rule.js';
import { RaciLimitePagoV6Rule } from './raci-limite-pago.rule.js';
import { RaciLimitePresupuestarioV5Rule } from './raci-limite-presupuestario.rule.js';
import { RaciSecuenciaGastoV4Rule } from './raci-secuencia-gasto.rule.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//asiento con todo en cero salvo lo que se pida
const asiento = (
  id: number,
  extra: Partial<DatosTransaccionRaci> = {},
): TransaccionRaci =>
  new TransaccionRaci({
    id,
    asiento: id,
    fecha: '2026-03-10',
    expediente: null,
    concepto: `Asiento ${id}`,
    compromisoInstrumentoLegal: null,
    compromisoDelMes: 0,
    compromisoAcumulado: 0,
    compromisoOrdenProvision: null,
    devengadoDelMes: 0,
    devengadoAcumulado: 0,
    devengadoSaldo: 0,
    devengadoOrdenPago: null,
    pagoNumeroCheque: null,
    pagoDelMes: 0,
    pagoAcumulado: 0,
    pagoSaldoAPagar: 0,
    ...extra,
  });

const raci = (...asientos: TransaccionRaci[]) => new Raci(7, asientos, 1);

const filaIE = (
  fila: number,
  extra: Partial<Record<string, number>> = {},
): TransaccionIngresoEgreso =>
  new TransaccionIngresoEgreso({
    id: fila,
    fila,
    fecha: '2026-03-10',
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
    ...extra,
  });

const filaBanco = (
  id: number,
  cheque: string | null,
  retiro: number,
): TransaccionLibroBanco =>
  new TransaccionLibroBanco(
    '2026-03-10',
    cheque,
    `Pago ${id}`,
    0,
    retiro,
    0,
    id,
  );

const contexto = (extra: Partial<AuditoriaContext> = {}): AuditoriaContext => ({
  cuentaMensualId: 7,
  ...extra,
});

describe('V4 secuencia lógica del gasto', () => {
  const regla = new RaciSecuenciaGastoV4Rule();

  it('declara su código, su descripción y el libro que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.V4);
    expect(regla.descripcion).toBe('Secuencia lógica del gasto');
    expect(regla.librosRequeridos).toEqual(['RACI']);
  });

  it('VERIFICADO si cada pago tiene su devengado y su compromiso acumulados', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { compromisoAcumulado: 100 }),
          asiento(2, { compromisoAcumulado: 100, devengadoAcumulado: 100 }),
          asiento(3, {
            compromisoAcumulado: 100,
            devengadoAcumulado: 100,
            pagoAcumulado: 100,
          }),
        ),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.V4,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 3,
    });
  });

  it('un asiento de solo compromiso o de solo devengado no es un error', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { compromisoDelMes: 50, compromisoAcumulado: 50 }),
          asiento(2, {
            devengadoDelMes: 20,
            compromisoAcumulado: 50,
            devengadoAcumulado: 20,
          }),
        ),
      }),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('marca el pago sin devengado y la observación lleva el asiento y el importe', () => {
    const [observacion] = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { compromisoAcumulado: 100 }),
          asiento(2, {
            compromisoAcumulado: 100,
            pagoDelMes: 60,
            pagoAcumulado: 60,
          }),
        ),
      }),
    ).observaciones;

    expect(observacion).toMatchObject({
      codigoRegla: validationsCode.V4,
      tipo: validationsType.INTERNA,
      libroOrigen: LibroOrigen.RACI,
      estado: EstadoObservacion.ABIERTA,
      transaccionRaciId: 2,
      transaccionId: undefined,
      transaccionIngresoEgresoId: undefined,
      valorInformado: 60,
      valorCalculado: 0,
      diferencia: 60,
    });
    expect(observacion.descripcion).toContain('Gasto fuera de secuencia');
    expect(observacion.descripcion).toContain('devengado (0.00)');
    expect(observacion.descripcion).not.toContain('compromiso');
  });

  it('marca el pago sin compromiso ni devengado y nombra ambos', () => {
    const [observacion] = regla.execute(
      contexto({ raci: raci(asiento(1, { pagoAcumulado: 10 })) }),
    ).observaciones;

    expect(observacion.descripcion).toContain('devengado');
    expect(observacion.descripcion).toContain('compromiso');
  });

  it('un RACI sin asientos da VERIFICADO con 0 filas', () => {
    expect(regla.execute(contexto({ raci: raci() }))).toMatchObject({
      estado: EstadoValidacion.VERIFICADO,
      filasEvaluadas: 0,
    });
  });
});

describe.each([
  [
    'V5 límite presupuestario',
    new RaciLimitePresupuestarioV5Rule(),
    validationsCode.V5,
    'Límite presupuestario',
    'Sobregiro presupuestario',
    (mayor: number, tope: number) => ({
      devengadoAcumulado: mayor,
      compromisoAcumulado: tope,
    }),
  ],
  [
    'V6 límite de pago',
    new RaciLimitePagoV6Rule(),
    validationsCode.V6,
    'Límite de pago',
    'Pago excede lo devengado',
    (mayor: number, tope: number) => ({
      pagoAcumulado: mayor,
      devengadoAcumulado: tope,
    }),
  ],
])('%s', (_nombre, regla, codigo, descripcion, titulo, datos) => {
  it('declara su código, su descripción y el libro que necesita', () => {
    expect(regla.codigo).toBe(codigo);
    expect(regla.descripcion).toBe(descripcion);
    expect(regla.librosRequeridos).toEqual(['RACI']);
  });

  it('VERIFICADO si lo acumulado no supera su tope, incluso en el límite', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(asiento(1, datos(100, 100)), asiento(2, datos(40, 100))),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: codigo,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 2,
    });
  });

  it('una diferencia de un centavo se tolera y de dos no', () => {
    const tolera = regla.execute(
      contexto({ raci: raci(asiento(1, datos(100.01, 100))) }),
    );
    const marca = regla.execute(
      contexto({ raci: raci(asiento(1, datos(100.02, 100))) }),
    );

    expect(tolera.estado).toBe(EstadoValidacion.VERIFICADO);
    expect(marca.estado).toBe(EstadoValidacion.FALLO);
  });

  it('marca solo los asientos que superan el tope, con sus importes', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        raci: raci(
          asiento(1, datos(10, 100)),
          asiento(2, datos(150.5, 100)),
          asiento(3, datos(20, 100)),
        ),
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: codigo,
      tipo: validationsType.INTERNA,
      libroOrigen: LibroOrigen.RACI,
      transaccionRaciId: 2,
      valorInformado: 150.5,
      valorCalculado: 100,
      diferencia: 50.5,
    });
    expect(observaciones[0].descripcion).toContain(titulo);
    expect(observaciones[0].descripcion).toContain('50.50');
  });
});

describe('C1 egresos devengados', () => {
  const regla = new CruceDevengadoC1Rule();
  const ie = (...filas: TransaccionIngresoEgreso[]) =>
    new IngresosEgresos(7, null, filas, 1);

  it('declara su código, su descripción y los libros que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.C1);
    expect(regla.descripcion).toBe('Egresos devengados (RACI)');
    expect(regla.librosRequeridos).toEqual(['RACI', 'INGRESOS_EGRESOS']);
  });

  it('VERIFICADO si Σ devengado del mes del RACI = Σ egresos de los incisos 1 a 5', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { devengadoDelMes: 100.5 }),
          asiento(2, { devengadoDelMes: 49.5 }),
        ),
        ingresosEgresos: ie(
          filaIE(1, { egresoInc1: 100, egresoInc2: 0.5 }),
          filaIE(2, { egresoInc3: 10, egresoInc4: 20, egresoInc5: 19.5 }),
        ),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.C1,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 1,
    });
  });

  it('una observación de cuenta, sin fila, con el RACI como libro informado', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        raci: raci(asiento(1, { devengadoDelMes: 300 })),
        ingresosEgresos: ie(filaIE(1, { egresoInc1: 250 })),
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: validationsCode.C1,
      tipo: validationsType.CRUZAMIENTO,
      libroOrigen: LibroOrigen.RACI,
      transaccionRaciId: undefined,
      transaccionId: undefined,
      transaccionIngresoEgresoId: undefined,
      valorInformado: 300,
      valorCalculado: 250,
      diferencia: 50,
    });
    expect(observaciones[0].descripcion).toContain(
      'Inconsistencias en gastos devengados',
    );
  });

  it('tolera un centavo', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(asiento(1, { devengadoDelMes: 100.01 })),
        ingresosEgresos: ie(filaIE(1, { egresoInc1: 100 })),
      }),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });
});

describe('C2 egresos pagados', () => {
  const regla = new CrucePagadoC2Rule();
  const ie = (...filas: TransaccionIngresoEgreso[]) =>
    new IngresosEgresos(7, null, filas, 1);

  it('declara su código, su descripción y los libros que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.C2);
    expect(regla.descripcion).toBe('Egresos pagados (RACI)');
    expect(regla.librosRequeridos).toEqual(['RACI', 'INGRESOS_EGRESOS']);
  });

  it('suma solo los pagos con cheque del RACI contra el banco haber', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { pagoDelMes: 80, pagoNumeroCheque: '0123' }),
          //un pago en efectivo (sin cheque) no cuenta contra el banco
          asiento(2, { pagoDelMes: 999 }),
          asiento(3, { pagoDelMes: 20, pagoNumeroCheque: ' 124 ' }),
        ),
        ingresosEgresos: ie(filaIE(1, { bancoHaber: 100 })),
      }),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('marca la diferencia como una observación de cuenta', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        raci: raci(asiento(1, { pagoDelMes: 80, pagoNumeroCheque: '1' })),
        ingresosEgresos: ie(filaIE(1, { bancoHaber: 100 })),
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: validationsCode.C2,
      tipo: validationsType.CRUZAMIENTO,
      libroOrigen: LibroOrigen.RACI,
      valorInformado: 80,
      valorCalculado: 100,
      diferencia: 20,
    });
    expect(observaciones[0].descripcion).toContain('Inconsistencias en pagos');
  });
});

describe('P1 existencia de cheques', () => {
  const regla = new ChequeExistenciaP1Rule();
  const banco = (...filas: TransaccionLibroBanco[]) => [
    new LibroBanco(7, '001/0001', filas, 1),
  ];

  it('declara su código, su descripción y los libros que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.P1);
    expect(regla.descripcion).toBe('Existencia de cheques');
    expect(regla.librosRequeridos).toEqual(['RACI', 'LIBRO_BANCO']);
  });

  it('VERIFICADO si todos los cheques del RACI están en el banco; los asientos sin cheque no cuentan', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { pagoNumeroCheque: '555', pagoDelMes: 10 }),
          asiento(2, { devengadoDelMes: 10 }),
        ),
        librosBanco: banco(filaBanco(1, '555', 10)),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.P1,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 1,
    });
  });

  it('compara los cheques normalizados: espacios, mayúsculas y ceros a la izquierda', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { pagoNumeroCheque: ' 000123 ', pagoDelMes: 1 }),
          asiento(2, { pagoNumeroCheque: 'ch-9', pagoDelMes: 1 }),
        ),
        librosBanco: banco(filaBanco(1, '123', 1), filaBanco(2, 'CH-9', 1)),
      }),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('marca el asiento con un cheque que el banco no tiene, con el importe pagado', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { pagoNumeroCheque: '555', pagoDelMes: 10 }),
          asiento(2, { pagoNumeroCheque: '777', pagoDelMes: 45.5 }),
        ),
        librosBanco: banco(filaBanco(1, '555', 10)),
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: validationsCode.P1,
      tipo: validationsType.INTEGRIDAD,
      libroOrigen: LibroOrigen.RACI,
      transaccionRaciId: 2,
      valorInformado: 45.5,
      valorCalculado: 0,
      diferencia: 45.5,
    });
    expect(observaciones[0].descripcion).toContain(
      'Cheque no registrado en libro banco',
    );
    expect(observaciones[0].descripcion).toContain('777');
  });

  it('busca el cheque en todos los libros banco de la rendición', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(asiento(1, { pagoNumeroCheque: '9', pagoDelMes: 1 })),
        librosBanco: [
          new LibroBanco(7, 'A', [filaBanco(1, '1', 1)], 1),
          new LibroBanco(7, 'B', [filaBanco(2, '9', 1)], 2),
        ],
      }),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('un cheque repetido en dos asientos marca cada asiento una vez', () => {
    const { observaciones } = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { pagoNumeroCheque: '8', pagoDelMes: 1 }),
          asiento(2, { pagoNumeroCheque: '8', pagoDelMes: 1 }),
        ),
        librosBanco: banco(filaBanco(1, '1', 1)),
      }),
    );

    expect(observaciones.map((o) => o.transaccionRaciId)).toEqual([1, 2]);
  });
});

describe('P2 monto de cheques', () => {
  const regla = new ChequeMontoP2Rule();
  const banco = (...filas: TransaccionLibroBanco[]) => [
    new LibroBanco(7, '001/0001', filas, 1),
  ];

  it('declara su código, su descripción y los libros que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.P2);
    expect(regla.descripcion).toBe('Monto de cheques');
    expect(regla.librosRequeridos).toEqual(['RACI', 'LIBRO_BANCO']);
  });

  it('VERIFICADO si el monto pagado coincide con el retiro del cheque', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(asiento(1, { pagoNumeroCheque: '555', pagoDelMes: 120.5 })),
        librosBanco: banco(filaBanco(1, '555', 120.5)),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.P2,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 1,
    });
  });

  it('marca el asiento cuyo monto no coincide, con ambos importes', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        raci: raci(asiento(1, { pagoNumeroCheque: '555', pagoDelMes: 100 })),
        librosBanco: banco(filaBanco(1, '555', 90)),
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: validationsCode.P2,
      tipo: validationsType.INTEGRIDAD,
      libroOrigen: LibroOrigen.RACI,
      transaccionRaciId: 1,
      valorInformado: 100,
      valorCalculado: 90,
      diferencia: 10,
    });
    expect(observaciones[0].descripcion).toContain(
      'Monto de cheque inconsistente',
    );
  });

  it('un cheque pagado en varios asientos se compara por su total', () => {
    const bien = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { pagoNumeroCheque: '7', pagoDelMes: 60 }),
          asiento(2, { pagoNumeroCheque: '0007', pagoDelMes: 40 }),
        ),
        librosBanco: banco(filaBanco(1, '7', 100)),
      }),
    );
    const mal = regla.execute(
      contexto({
        raci: raci(
          asiento(1, { pagoNumeroCheque: '7', pagoDelMes: 60 }),
          asiento(2, { pagoNumeroCheque: '7', pagoDelMes: 30 }),
        ),
        librosBanco: banco(filaBanco(1, '7', 100)),
      }),
    );

    expect(bien.estado).toBe(EstadoValidacion.VERIFICADO);
    expect(bien.filasEvaluadas).toBe(2);
    expect(mal.observaciones.map((o) => o.transaccionRaciId)).toEqual([1, 2]);
    expect(mal.observaciones[0]).toMatchObject({
      valorInformado: 90,
      valorCalculado: 100,
      diferencia: 10,
    });
  });

  it('ignora los cheques que el banco no tiene (los marca P1)', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(asiento(1, { pagoNumeroCheque: '999', pagoDelMes: 50 })),
        librosBanco: banco(filaBanco(1, '1', 5)),
      }),
    );

    expect(resultado).toMatchObject({
      estado: EstadoValidacion.VERIFICADO,
      filasEvaluadas: 0,
    });
  });

  it('suma los retiros del mismo cheque en varias filas del banco', () => {
    const resultado = regla.execute(
      contexto({
        raci: raci(asiento(1, { pagoNumeroCheque: '3', pagoDelMes: 100 })),
        librosBanco: banco(filaBanco(1, '3', 40), filaBanco(2, '3', 60)),
      }),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });
});
