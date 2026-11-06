import { IngresosEgresos } from '../../../ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import { TransaccionIngresoEgreso } from '../../../ingresos-egresos/domain/entities/transaccion-ingreso-egreso.domain.js';
import { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../../libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { Raci } from '../../../raci/domain/entities/raci.domain.js';
import { Rai } from '../../../rai/domain/entities/rai.domain.js';
import { TransaccionRai } from '../../../rai/domain/entities/transaccion-rai.domain.js';
import { TransaccionRaci } from '../../../raci/domain/entities/transaccion-raci.domain.js';
import { EstadoValidacion } from '../types/auditoria.types.js';
import type { AuditoriaContext } from './auditoria-context.js';
import { FechasPeriodoF1Rule } from './fechas-periodo.rule.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

const MARZO_2026 = { ejercicioFiscal: 2026, mes: 3 };

const filaBanco = (id: number, fecha: string | null) =>
  new TransaccionLibroBanco(fecha, null, `Fila ${id}`, 0, 0, 0, id);
const filaIE = (fila: number, fecha: string) =>
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
  });
const asientoRaci = (id: number, fecha: string, pagoDelMes = 10) =>
  new TransaccionRaci({
    id,
    asiento: id,
    fecha,
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
    pagoDelMes,
    pagoAcumulado: 0,
    pagoSaldoAPagar: 0,
  });

const asientoRai = (
  id: number,
  fecha: string,
  ingresosDiarios: number,
  asiento: number | null = null,
) =>
  new TransaccionRai({
    id,
    asiento,
    fecha,
    planillaNumero: null,
    concepto: `Ingreso ${id}`,
    ingresosDiarios,
    ingresosMensuales: 0,
    ingresosAcumulados: 0,
    saldo: 0,
  });

const contexto = (extra: Partial<AuditoriaContext> = {}): AuditoriaContext => ({
  cuentaMensualId: 7,
  periodo: MARZO_2026,
  librosBanco: [
    new LibroBanco(
      7,
      '001/0001',
      [filaBanco(1, '2026-03-01'), filaBanco(2, '2026-03-15')],
      1,
    ),
  ],
  ingresosEgresos: new IngresosEgresos(
    7,
    null,
    [filaIE(1, '2026-03-01'), filaIE(2, '2026-03-20')],
    1,
  ),
  ...extra,
});

describe('F1 coherencia de fechas', () => {
  const regla = new FechasPeriodoF1Rule();

  it('declara su código, su descripción y los libros que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.F1);
    expect(regla.descripcion).toBe('Coherencia de fechas');
    expect(regla.librosRequeridos).toEqual(['LIBRO_BANCO', 'INGRESOS_EGRESOS']);
  });

  it('VERIFICADO si todas las fechas están en el mes; cuenta las filas revisadas sin la base', () => {
    const resultado = regla.execute(
      contexto({
        raci: new Raci(
          7,
          [asientoRaci(1, '2026-03-02'), asientoRaci(2, '2026-03-31')],
          1,
        ),
      }),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.F1,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
      //1 de banco + 1 de I/E (la base de cada uno no cuenta) + 2 del RACI
      filasEvaluadas: 4,
    });
  });

  it('sin período no puede evaluar: VERIFICADO con 0 filas', () => {
    const resultado = regla.execute(
      contexto({
        periodo: undefined,
        ingresosEgresos: new IngresosEgresos(
          7,
          null,
          [filaIE(1, '2020-01-01'), filaIE(2, '2020-01-02')],
          1,
        ),
      }),
    );

    expect(resultado).toMatchObject({
      estado: EstadoValidacion.VERIFICADO,
      filasEvaluadas: 0,
    });
  });

  it('la primera fila (el saldo anterior) puede tener la fecha del mes previo', () => {
    const resultado = regla.execute(
      contexto({
        librosBanco: [
          new LibroBanco(
            7,
            null,
            [filaBanco(1, '2026-02-28'), filaBanco(2, '2026-03-02')],
            1,
          ),
        ],
        ingresosEgresos: new IngresosEgresos(
          7,
          null,
          [filaIE(2, '2026-03-02'), filaIE(1, '2026-02-28')],
          1,
        ),
      }),
    );

    //la base de I/E es la fila 1 aunque venga después en el arreglo
    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('marca la fila del banco fuera del mes, con su id y el libro de origen', () => {
    const { estado, observaciones } = regla.execute(
      contexto({
        librosBanco: [
          new LibroBanco(
            7,
            '001/0001',
            [filaBanco(1, '2026-03-01'), filaBanco(2, '2026-04-02')],
            1,
          ),
        ],
      }),
    );

    expect(estado).toBe(EstadoValidacion.FALLO);
    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      codigoRegla: validationsCode.F1,
      tipo: validationsType.FECHAS,
      libroOrigen: LibroOrigen.LIBRO_BANCO,
      estado: EstadoObservacion.ABIERTA,
      transaccionId: 2,
      transaccionIngresoEgresoId: undefined,
      transaccionRaciId: undefined,
    });
    expect(observaciones[0].descripcion).toContain('Fecha fuera de periodo');
    expect(observaciones[0].descripcion).toContain('2026-04-02');
    expect(observaciones[0].descripcion).toContain('marzo de 2026');
  });

  it('el mismo mes de otro ejercicio también está fuera de periodo', () => {
    const { observaciones } = regla.execute(
      contexto({
        ingresosEgresos: new IngresosEgresos(
          7,
          null,
          [filaIE(1, '2026-03-01'), filaIE(2, '2025-03-10')],
          1,
        ),
      }),
    );

    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      libroOrigen: LibroOrigen.INGRESOS_EGRESOS,
      transaccionIngresoEgresoId: 2,
    });
    expect(observaciones[0].descripcion).toContain('fila 2');
  });

  it('marca el asiento del RACI con movimiento y fecha fuera del mes, y omite los asientos sin movimiento', () => {
    const { observaciones } = regla.execute(
      contexto({
        raci: new Raci(
          7,
          [
            asientoRaci(1, '2026-02-01', 0), //base de bloque: sin movimiento
            asientoRaci(2, '2026-02-27', 15),
          ],
          1,
        ),
      }),
    );

    expect(observaciones).toHaveLength(1);
    expect(observaciones[0]).toMatchObject({
      libroOrigen: LibroOrigen.RACI,
      transaccionRaciId: 2,
    });
    expect(observaciones[0].descripcion).toContain('asiento 2');
  });

  it('una fecha ausente en el banco no se marca; un texto que no es AAAA-MM-DD sí', () => {
    const { filasEvaluadas, observaciones } = regla.execute(
      contexto({
        librosBanco: [
          new LibroBanco(
            7,
            null,
            [
              filaBanco(1, '2026-03-01'),
              filaBanco(2, null),
              filaBanco(3, ''),
              filaBanco(4, '3 de marzo'),
            ],
            1,
          ),
        ],
      }),
    );

    expect(filasEvaluadas).toBe(1 /* banco */ + 1 /* I/E */);
    expect(observaciones).toHaveLength(1);
    expect(observaciones[0].transaccionId).toBe(4);
    expect(observaciones[0].descripcion).toContain('AAAA-MM-DD');
  });

  it('ordena el banco por id y no muta los arreglos', () => {
    const filas = [filaBanco(3, '2026-05-01'), filaBanco(1, '2026-01-01')];
    const { observaciones } = regla.execute(
      contexto({ librosBanco: [new LibroBanco(7, null, filas, 1)] }),
    );

    //la base es el id 1 aunque venga segunda; el id 3 se revisa
    expect(observaciones.map((o) => o.transaccionId)).toEqual([3]);
    expect(filas.map((f) => f.id)).toEqual([3, 1]);
  });

  it('marca el ingreso del RAI con importe y fecha fuera del mes y omite los que no tienen importe', () => {
    const { observaciones, filasEvaluadas } = regla.execute(
      contexto({
        rai: new Rai(
          7,
          [
            asientoRai(1, '2026-02-01', 0), //base: sin importe en el día
            asientoRai(2, '2026-03-05', 10),
            asientoRai(3, '2026-04-02', 20, 5),
            asientoRai(4, '2026-02-27', 30),
          ],
          1,
        ),
      }),
    );

    //1 de banco + 1 de I/E + los 3 ingresos del RAI con importe
    expect(filasEvaluadas).toBe(5);
    expect(observaciones.map((o) => o.transaccionRaiId)).toEqual([3, 4]);
    expect(observaciones[0]).toMatchObject({
      libroOrigen: LibroOrigen.RAI,
      transaccionRaciId: undefined,
    });
    expect(observaciones[0].descripcion).toContain('asiento 5 del RAI');
    expect(observaciones[1].descripcion).toContain('ingreso "Ingreso 4"');
  });
});
