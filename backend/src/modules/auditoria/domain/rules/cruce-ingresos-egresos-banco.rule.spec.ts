import { IngresosEgresos } from '../../../ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import {
  type DatosTransaccionIngresoEgreso,
  TransaccionIngresoEgreso,
} from '../../../ingresos-egresos/domain/entities/transaccion-ingreso-egreso.domain.js';
import { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import { TransaccionLibroBanco } from '../../../libro-banco/domain/entities/transaccion-libro-banco.domain.js';
import { EstadoValidacion } from '../types/auditoria.types.js';
import { CruceDepositosC4Rule } from './cruce-ingresos-egresos-banco-depositos.rule.js';
import { CruceRetirosC5Rule } from './cruce-ingresos-egresos-banco-retiros.rule.js';
import { CruceSaldoFinalC6Rule } from './cruce-ingresos-egresos-banco-saldofinal.rule.js';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from './validations.js';

const filaIE = (
  fila: number,
  extra: Partial<DatosTransaccionIngresoEgreso> = {},
) =>
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

const filaBanco = (
  id: number,
  depositos: number,
  retiro: number,
  saldo: number,
) =>
  new TransaccionLibroBanco(
    null,
    null,
    `Mov ${id}`,
    depositos,
    retiro,
    saldo,
    id,
  );

const libroBanco = (id: number, ...transacciones: TransaccionLibroBanco[]) =>
  new LibroBanco(7, `CTA/${id}`, transacciones, id);

const contexto = (ie: TransaccionIngresoEgreso[], ...bancos: LibroBanco[]) => ({
  cuentaMensualId: 7,
  librosBanco: bancos,
  ingresosEgresos: new IngresosEgresos(7, null, ie, 1),
});

//C4 y C5 son iguales salvo la columna: se prueban con el mismo conjunto de casos
describe.each([
  {
    nombre: 'C4 (depósitos)',
    regla: new CruceDepositosC4Rule(),
    codigo: validationsCode.C4,
    ie: (importe: number, fila: number) => filaIE(fila, { bancoDebe: importe }),
    banco: (importe: number, id: number) => filaBanco(id, importe, 0, 0),
    mensaje: (ie: string, banco: string, dif: string) =>
      `Inconsistencia de depósitos bancarios: el total de banco debe del libro de Ingresos y Egresos (${ie}) no coincide con el total de depósitos del Libro Banco (${banco}). Diferencia: ${dif}.`,
  },
  {
    nombre: 'C5 (retiros)',
    regla: new CruceRetirosC5Rule(),
    codigo: validationsCode.C5,
    ie: (importe: number, fila: number) =>
      filaIE(fila, { bancoHaber: importe }),
    banco: (importe: number, id: number) => filaBanco(id, 0, importe, 0),
    mensaje: (ie: string, banco: string, dif: string) =>
      `Inconsistencia en retiros bancarios: el total de banco haber del libro de Ingresos y Egresos (${ie}) no coincide con el total de retiros del Libro Banco (${banco}). Diferencia: ${dif}.`,
  },
])('$nombre', ({ regla, codigo, ie, banco, mensaje }) => {
  it('declara su código y los dos libros que necesita', () => {
    expect(regla.codigo).toBe(codigo);
    expect(regla.librosRequeridos).toEqual(['LIBRO_BANCO', 'INGRESOS_EGRESOS']);
  });

  it('VERIFICADO si los totales coinciden', () => {
    const resultado = regla.execute(
      contexto([ie(100, 1), ie(50, 2)], libroBanco(1, banco(150, 1))),
    );

    expect(resultado).toEqual({
      codigoRegla: codigo,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
    });
  });

  it('FALLO con una única observación de cuenta, sin fila, y el detalle de ambos totales', () => {
    const resultado = regla.execute(
      contexto([ie(100, 1), ie(50, 2)], libroBanco(1, banco(140, 1))),
    );

    expect(resultado.estado).toBe(EstadoValidacion.FALLO);
    expect(resultado.observaciones).toHaveLength(1);
    const [obs] = resultado.observaciones;
    expect(obs.cuentaMensualId).toBe(7);
    expect(obs.codigoRegla).toBe(codigo);
    expect(obs.tipo).toBe(validationsType.CRUZAMIENTO);
    expect(obs.libroOrigen).toBe(LibroOrigen.INGRESOS_EGRESOS);
    expect(obs.estado).toBe(EstadoObservacion.ABIERTA);
    expect(obs.transaccionId).toBeUndefined();
    expect(obs.transaccionIngresoEgresoId).toBeUndefined();
    expect(obs.descripcion).toBe(mensaje('150.00', '140.00', '10.00'));
  });

  it('compara contra la suma de todos los libros banco de la rendición', () => {
    const resultado = regla.execute(
      contexto(
        [ie(300, 1)],
        libroBanco(1, banco(100, 1), banco(50, 2)),
        libroBanco(2, banco(150, 3)),
      ),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('tolera hasta 0.01 de diferencia y marca desde 0.02', () => {
    const tolerada = regla.execute(
      contexto([ie(100.01, 1)], libroBanco(1, banco(100, 1))),
    );
    const marcada = regla.execute(
      contexto([ie(100.02, 1)], libroBanco(1, banco(100, 1))),
    );

    expect(tolerada.estado).toBe(EstadoValidacion.VERIFICADO);
    expect(marcada.estado).toBe(EstadoValidacion.FALLO);
  });

  it('no marca falsos positivos por coma flotante', () => {
    const resultado = regla.execute(
      contexto([ie(0.1, 1), ie(0.2, 2)], libroBanco(1, banco(0.3, 1))),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });
});

describe('C6 (saldo final)', () => {
  const regla = new CruceSaldoFinalC6Rule();

  it('declara su código y los dos libros que necesita', () => {
    expect(regla.codigo).toBe(validationsCode.C6);
    expect(regla.librosRequeridos).toEqual(['LIBRO_BANCO', 'INGRESOS_EGRESOS']);
  });

  it('VERIFICADO si el saldo de la última fila coincide', () => {
    const resultado = regla.execute(
      contexto(
        [filaIE(1, { bancoSaldo: 100 }), filaIE(2, { bancoSaldo: 1300 })],
        libroBanco(1, filaBanco(1, 0, 0, 900), filaBanco(2, 0, 0, 1300)),
      ),
    );

    expect(resultado).toEqual({
      codigoRegla: validationsCode.C6,
      estado: EstadoValidacion.VERIFICADO,
      observaciones: [],
    });
  });

  it('FALLO con una observación de cuenta y el detalle de ambos saldos', () => {
    const resultado = regla.execute(
      contexto(
        [filaIE(1, { bancoSaldo: 100 }), filaIE(2, { bancoSaldo: 1150 })],
        libroBanco(1, filaBanco(1, 0, 0, 900), filaBanco(2, 0, 0, 1300)),
      ),
    );

    expect(resultado.estado).toBe(EstadoValidacion.FALLO);
    expect(resultado.observaciones).toHaveLength(1);
    const [obs] = resultado.observaciones;
    expect(obs.tipo).toBe(validationsType.CRUZAMIENTO);
    expect(obs.libroOrigen).toBe(LibroOrigen.INGRESOS_EGRESOS);
    expect(obs.transaccionId).toBeUndefined();
    expect(obs.transaccionIngresoEgresoId).toBeUndefined();
    expect(obs.descripcion).toBe(
      'Saldo bancario inconsistente: el saldo final de banco del libro de Ingresos y Egresos (1150.00) no coincide con el saldo final del Libro Banco (1300.00). Diferencia: 150.00.',
    );
  });

  it('la última fila es la de mayor número de fila, no la última del arreglo', () => {
    const resultado = regla.execute(
      contexto(
        [filaIE(2, { bancoSaldo: 500 }), filaIE(1, { bancoSaldo: 999 })],
        libroBanco(1, filaBanco(1, 0, 0, 500)),
      ),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('la última fila del libro banco es la de mayor id, no la última del arreglo', () => {
    const resultado = regla.execute(
      contexto(
        [filaIE(1, { bancoSaldo: 500 })],
        libroBanco(1, filaBanco(2, 0, 0, 500), filaBanco(1, 0, 0, 999)),
      ),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('con varios libros banco compara con la suma del saldo final de cada uno', () => {
    const resultado = regla.execute(
      contexto(
        [filaIE(1, { bancoSaldo: 1000 })],
        libroBanco(1, filaBanco(1, 0, 0, 50), filaBanco(2, 0, 0, 700)),
        libroBanco(2, filaBanco(3, 0, 0, 300)),
      ),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('un libro banco sin filas no suma', () => {
    const resultado = regla.execute(
      contexto(
        [filaIE(1, { bancoSaldo: 700 })],
        libroBanco(1, filaBanco(1, 0, 0, 700)),
        libroBanco(2),
      ),
    );

    expect(resultado.estado).toBe(EstadoValidacion.VERIFICADO);
  });

  it('tolera hasta 0.01 de diferencia y marca desde 0.02', () => {
    const banco = libroBanco(1, filaBanco(1, 0, 0, 100));

    expect(
      regla.execute(contexto([filaIE(1, { bancoSaldo: 100.01 })], banco))
        .estado,
    ).toBe(EstadoValidacion.VERIFICADO);
    expect(
      regla.execute(contexto([filaIE(1, { bancoSaldo: 100.02 })], banco))
        .estado,
    ).toBe(EstadoValidacion.FALLO);
  });

  it('no muta los arreglos de transacciones', () => {
    const ie = [filaIE(2, { bancoSaldo: 5 }), filaIE(1, { bancoSaldo: 9 })];
    const banco = [filaBanco(2, 0, 0, 5), filaBanco(1, 0, 0, 9)];

    regla.execute(contexto(ie, libroBanco(1, ...banco)));

    expect(ie.map((t) => t.fila)).toEqual([2, 1]);
    expect(banco.map((t) => t.id)).toEqual([2, 1]);
  });
});
