import { IngresosEgresos } from '../../../ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import { TransaccionIngresoEgreso } from '../../../ingresos-egresos/domain/entities/transaccion-ingreso-egreso.domain.js';
import { Rai } from '../../../rai/domain/entities/rai.domain.js';
import {
  TransaccionRai,
  type DatosTransaccionRai,
} from '../../../rai/domain/entities/transaccion-rai.domain.js';
import { EstadoValidacion } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { CruceIngresosC3Rule } from './cruce-rai-ingresos-egresos-ingresos.rule.js';
import { IngresosRaiMayorP3Rule } from './ingresos-rai-mayor.rule.js';
import { RaiSumaMensualV7Rule } from './rai-suma-mensual.rule.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

//asiento del RAI con los acumulados en cero salvo lo que se pida
const asiento = (
  id: number,
  fecha: string,
  ingresosDiarios: number,
  extra: Partial<DatosTransaccionRai> = {},
): TransaccionRai =>
  new TransaccionRai({
    id,
    asiento: null,
    fecha,
    planillaNumero: null,
    concepto: `Ingreso ${id}`,
    ingresosDiarios,
    ingresosMensuales: 0,
    ingresosAcumulados: 0,
    saldo: 0,
    ...extra,
  });

const rai = (...asientos: TransaccionRai[]) => new Rai(7, asientos, 1);

const filaIE = (
  fila: number,
  fecha: string,
  extra: Partial<Record<string, number>> = {},
): TransaccionIngresoEgreso =>
  new TransaccionIngresoEgreso({
    id: fila,
    fila,
    fecha,
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
const ie = (...filas: TransaccionIngresoEgreso[]) =>
  new IngresosEgresos(7, null, filas, 1);

const contexto = (extra: Partial<AuditoriaContext> = {}): AuditoriaContext => ({
  cuentaMensualId: 7,
  ...extra,
});

describe('V7 coherencia de suma mensual', () => {
  const regla = new RaiSumaMensualV7Rule();

  it('declara su código, su descripción y el libro que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.V7);
    expect(regla.descripcion).toBe('Coherencia de suma mensual');
    expect(regla.librosRequeridos).toEqual(['RAI']);
  });

  it('VERIFICADO si la suma de los ingresos diarios es el ingreso mensual de la última fila', () => {
    const resultado = regla.execute(
      contexto({
        rai: rai(
          asiento(1, '2025-09-01', 48895890, { ingresosMensuales: 48895890 }),
          asiento(2, '2025-09-29', 12000000, { ingresosMensuales: 60895890 }),
        ),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.V7,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 1, //un mes
    });
  });

  it('marca la última fila del mes con los importes del hallazgo', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        rai: rai(
          asiento(1, '2025-09-01', 100, { ingresosMensuales: 100 }),
          asiento(2, '2025-09-29', 50, { ingresosMensuales: 140 }),
        ),
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: validationsCode.V7,
      tipo: validationsType.INTERNA,
      libroOrigen: LibroOrigen.RAI,
      estado: EstadoObservacion.ABIERTA,
      transaccionRaiId: 2,
      transaccionId: undefined,
      transaccionIngresoEgresoId: undefined,
      transaccionRaciId: undefined,
      valorInformado: 140,
      valorCalculado: 150,
      diferencia: 10,
    });
    expect(observaciones[0].descripcion).toContain(
      'Inconsistencia suma mensual',
    );
    expect(observaciones[0].descripcion).toContain('2025-09');
  });

  it('revisa cada mes por separado y marca solo el que no cierra', () => {
    const { filasEvaluadas, observaciones } = regla.execute(
      contexto({
        rai: rai(
          asiento(1, '2025-08-30', 10, { ingresosMensuales: 10 }),
          asiento(2, '2025-09-01', 20, { ingresosMensuales: 20 }),
          asiento(3, '2025-09-02', 5, { ingresosMensuales: 99 }),
        ),
      }),
    );

    expect(filasEvaluadas).toBe(2);
    expect(observaciones.map((o) => o.transaccionRaiId)).toEqual([3]);
  });

  it('tolera un centavo y no dos', () => {
    const con = (mensual: number) =>
      regla.execute(
        contexto({
          rai: rai(
            asiento(1, '2025-09-01', 100, { ingresosMensuales: mensual }),
          ),
        }),
      ).estado;

    expect(con(100.01)).toBe(EstadoValidacion.VERIFICADO);
    expect(con(100.02)).toBe(EstadoValidacion.FALLO);
  });

  it('toma la última fila por id, aunque el arreglo venga desordenado, y no lo muta', () => {
    const filas = [
      asiento(2, '2025-09-29', 50, { ingresosMensuales: 150 }),
      asiento(1, '2025-09-01', 100, { ingresosMensuales: 100 }),
    ];
    const resultado = regla.execute(contexto({ rai: rai(...filas) }));

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
    expect(filas.map((f) => f.id)).toEqual([2, 1]);
  });

  it('un RAI sin asientos da VERIFICADO con 0 filas', () => {
    expect(regla.execute(contexto({ rai: rai() }))).toMatchObject({
      estado: EstadoValidacion.VERIFICADO,
      filasEvaluadas: 0,
    });
  });
});

describe('C3 ingresos del mes', () => {
  const regla = new CruceIngresosC3Rule();

  it('declara su código, su descripción y los libros que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.C3);
    expect(regla.descripcion).toBe('Ingresos del mes (RAI)');
    expect(regla.librosRequeridos).toEqual(['RAI', 'INGRESOS_EGRESOS']);
  });

  it('VERIFICADO si Σ ingresos diarios del RAI = Σ (municipal + otras) del I/E', () => {
    const resultado = regla.execute(
      contexto({
        rai: rai(
          asiento(1, '2026-03-02', 100.5),
          asiento(2, '2026-03-09', 49.5),
        ),
        ingresosEgresos: ie(
          filaIE(1, '2026-03-02', { ingresoMunicipal: 100 }),
          filaIE(2, '2026-03-09', {
            ingresoMunicipal: 0.5,
            ingresoOtras: 49.5,
          }),
        ),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.C3,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 1,
    });
  });

  it('una observación de cuenta, sin fila, con el RAI como libro informado', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        rai: rai(asiento(1, '2026-03-02', 300)),
        ingresosEgresos: ie(filaIE(1, '2026-03-02', { ingresoOtras: 250 })),
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: validationsCode.C3,
      tipo: validationsType.CRUZAMIENTO,
      libroOrigen: LibroOrigen.RAI,
      transaccionRaiId: undefined,
      transaccionId: undefined,
      transaccionIngresoEgresoId: undefined,
      valorInformado: 300,
      valorCalculado: 250,
      diferencia: 50,
    });
    expect(observaciones[0].descripcion).toContain(
      'Inconsistencia en ingresos',
    );
  });

  it('tolera un centavo', () => {
    const resultado = regla.execute(
      contexto({
        rai: rai(asiento(1, '2026-03-02', 100.01)),
        ingresosEgresos: ie(filaIE(1, '2026-03-02', { ingresoMunicipal: 100 })),
      }),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });
});

describe('P3 existencia de ingresos', () => {
  const regla = new IngresosRaiMayorP3Rule();

  it('declara su código, su descripción y los libros que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.P3);
    expect(regla.descripcion).toBe('Existencia de ingresos');
    expect(regla.librosRequeridos).toEqual(['RAI', 'INGRESOS_EGRESOS']);
  });

  it('VERIFICADO si cada ingreso tiene su fila del mismo importe en el mismo mes, en cualquiera de las dos columnas', () => {
    const resultado = regla.execute(
      contexto({
        rai: rai(
          asiento(1, '2026-03-02', 100),
          asiento(2, '2026-03-09', 40.5),
          //un asiento sin importe en el día no es un ingreso
          asiento(3, '2026-03-10', 0),
        ),
        ingresosEgresos: ie(
          filaIE(1, '2026-03-20', { ingresoMunicipal: 100 }),
          filaIE(2, '2026-03-21', { ingresoOtras: 40.5 }),
        ),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.P3,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      filasEvaluadas: 2,
    });
  });

  it('marca el ingreso sin pareja, con su importe', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        rai: rai(
          asiento(1, '2026-03-02', 100),
          asiento(2, '2026-03-09', 77.7, { concepto: 'Tasa de servicios' }),
        ),
        ingresosEgresos: ie(filaIE(1, '2026-03-02', { ingresoMunicipal: 100 })),
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: validationsCode.P3,
      tipo: validationsType.INTEGRIDAD,
      libroOrigen: LibroOrigen.RAI,
      transaccionRaiId: 2,
      valorInformado: 77.7,
      valorCalculado: 0,
      diferencia: 77.7,
    });
    expect(observaciones[0].descripcion).toContain(
      'Ingreso no registrado en el Mayor',
    );
    expect(observaciones[0].descripcion).toContain('Tasa de servicios');
  });

  it('cada fila del I/E respalda un solo ingreso: dos ingresos iguales necesitan dos filas', () => {
    const una = regla.execute(
      contexto({
        rai: rai(asiento(1, '2026-03-02', 100), asiento(2, '2026-03-03', 100)),
        ingresosEgresos: ie(filaIE(1, '2026-03-02', { ingresoMunicipal: 100 })),
      }),
    );
    const dos = regla.execute(
      contexto({
        rai: rai(asiento(1, '2026-03-02', 100), asiento(2, '2026-03-03', 100)),
        ingresosEgresos: ie(
          filaIE(1, '2026-03-02', { ingresoMunicipal: 100 }),
          filaIE(2, '2026-03-03', { ingresoOtras: 100 }),
        ),
      }),
    );

    expect(una.observaciones.map((o) => o.transaccionRaiId)).toEqual([2]);
    expect(dos.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('el mismo importe en otro mes no cuenta', () => {
    const { observaciones } = regla.execute(
      contexto({
        rai: rai(asiento(1, '2026-03-02', 100)),
        ingresosEgresos: ie(filaIE(1, '2026-04-02', { ingresoMunicipal: 100 })),
      }),
    );

    expect(observaciones.map((o) => o.transaccionRaiId)).toEqual([1]);
  });

  it('tolera un centavo de diferencia entre los importes', () => {
    const resultado = regla.execute(
      contexto({
        rai: rai(asiento(1, '2026-03-02', 100.01)),
        ingresosEgresos: ie(filaIE(1, '2026-03-02', { ingresoMunicipal: 100 })),
      }),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });
});
