import type { IngestarIngresosEgresosComando } from '../modules/ingresos-egresos/application/use-cases/ingestar-ingresos-egresos.use-case.js';
import type { IngestarLibroBancoComando } from '../modules/libro-banco/application/use-cases/ingestar-libro-banco.use-case.js';

//datos de ejemplo de las rendiciones del seed; puro (sin Nest ni base) para poder probarlo con el motor de auditoría

export interface MovimientoSeed {
  //posición del libro banco en `saldosIniciales`
  libro: number;
  //día del mes (1-28)
  dia: number;
  concepto: string;
  //en centavos
  deposito?: number;
  retiro?: number;
  cajaDebe?: number;
  cajaHaber?: number;
}

//errores deliberados para probar al auditor
export interface ErroresSeed {
  //suma `diferencia` al saldo de esa fila del libro banco (índice dentro de sus transacciones, con la base en 0):
  //V3 marca esa fila y la siguiente, porque la siguiente parte del saldo informado
  bancoSaldo?: { libro: number; indice: number; diferencia: number };
  //suma `diferencia` al saldo de caja de esa fila del I/E y de todas las siguientes: V1 marca solo esa fila
  cajaSaldo?: { indice: number; diferencia: number };
}

export interface RendicionSeedEntrada {
  ejercicio: number;
  mes: number;
  //saldo inicial en centavos de cada libro banco; el N° de cuenta es `001/000N`
  saldosIniciales: number[];
  cajaInicial: number;
  movimientos: MovimientoSeed[];
  errores?: ErroresSeed;
}

export interface RendicionSeed {
  librosBanco: IngestarLibroBancoComando[];
  ingresosEgresos: IngestarIngresosEgresosComando;
}

//los importes del seed se piensan en pesos y se calculan en centavos enteros
export const pesos = (importe: number): number => Math.round(importe * 100);
const aImporte = (centavos: number): number => centavos / 100;

const fechaDe = (ejercicio: number, mes: number, dia: number): string =>
  `${ejercicio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

export const numeroCuentaSeed = (posicion: number): string =>
  `001/${String(posicion + 1).padStart(4, '0')}`;

//arma los libros de una rendición coherente: la primera fila de cada libro es el saldo anterior (la base que las
//reglas no validan), el I/E refleja cada movimiento bancario con el mismo debe/haber y su saldo corrido es la suma
//de los libros, así que V1, V2, V3 y los cruces C4, C5 y C6 dan VERIFICADO salvo los errores que se pidan
export function armarRendicion(entrada: RendicionSeedEntrada): RendicionSeed {
  const { ejercicio, mes, saldosIniciales, cajaInicial, movimientos } = entrada;
  const fecha = (dia: number) => fechaDe(ejercicio, mes, dia);

  const saldosLibro = [...saldosIniciales];
  const librosBanco = saldosIniciales.map((saldo, posicion) => ({
    numeroCuentaCte: numeroCuentaSeed(posicion),
    transacciones: [
      {
        fecha: fecha(1),
        aLaOrdenDe: 'Saldo anterior',
        depositos: 0,
        retiro: 0,
        saldo: aImporte(saldo),
      },
    ],
  }));

  let bancoSaldo = saldosIniciales.reduce((suma, saldo) => suma + saldo, 0);
  let cajaSaldo = cajaInicial;
  const filasIE = [
    filaIE(1, fecha(1), 'Saldo anterior', 0, 0, cajaSaldo, 0, 0, bancoSaldo),
  ];

  movimientos.forEach((mov, posicion) => {
    const deposito = mov.deposito ?? 0;
    const retiro = mov.retiro ?? 0;
    const cajaDebe = mov.cajaDebe ?? 0;
    const cajaHaber = mov.cajaHaber ?? 0;

    saldosLibro[mov.libro] += deposito - retiro;
    librosBanco[mov.libro].transacciones.push({
      fecha: fecha(mov.dia),
      aLaOrdenDe: mov.concepto,
      depositos: aImporte(deposito),
      retiro: aImporte(retiro),
      saldo: aImporte(saldosLibro[mov.libro]),
    });

    bancoSaldo += deposito - retiro;
    cajaSaldo += cajaDebe - cajaHaber;
    filasIE.push(
      filaIE(
        posicion + 2,
        fecha(mov.dia),
        mov.concepto,
        cajaDebe,
        cajaHaber,
        cajaSaldo,
        deposito,
        retiro,
        bancoSaldo,
      ),
    );
  });

  const { bancoSaldo: errorBanco, cajaSaldo: errorCaja } =
    entrada.errores ?? {};
  if (errorBanco) {
    const fila = librosBanco[errorBanco.libro].transacciones[errorBanco.indice];
    fila.saldo = aImporte(pesos(fila.saldo) + errorBanco.diferencia);
  }
  if (errorCaja) {
    for (const fila of filasIE.slice(errorCaja.indice)) {
      fila.cajaSaldo = aImporte(pesos(fila.cajaSaldo) + errorCaja.diferencia);
    }
  }

  return {
    librosBanco,
    ingresosEgresos: {
      numeroCuentaCte: numeroCuentaSeed(0),
      transacciones: filasIE,
    },
  };
}

//cada deposito se clasifica como ingreso municipal y cada retiro como egreso del inciso 1 (solo para que el libro
//se vea completo: las reglas no los validan)
function filaIE(
  fila: number,
  fecha: string,
  concepto: string,
  cajaDebe: number,
  cajaHaber: number,
  cajaSaldo: number,
  bancoDebe: number,
  bancoHaber: number,
  bancoSaldo: number,
) {
  return {
    fila,
    fecha,
    concepto,
    cajaDebe: aImporte(cajaDebe),
    cajaHaber: aImporte(cajaHaber),
    cajaSaldo: aImporte(cajaSaldo),
    bancoDebe: aImporte(bancoDebe),
    bancoHaber: aImporte(bancoHaber),
    bancoSaldo: aImporte(bancoSaldo),
    egresoInc1: aImporte(bancoHaber),
    egresoInc2: 0,
    egresoInc3: 0,
    egresoInc4: 0,
    egresoInc5: 0,
    ingresoMunicipal: aImporte(bancoDebe),
    ingresoOtras: 0,
    cuentasVariasDebe: 0,
    cuentasVariasHaber: 0,
  };
}

export type EstadoObjetivo = 'BORRADOR' | 'PRESENTADA';

export interface MesSeed {
  mes: number;
  descripcion: string;
  objetivo: EstadoObjetivo;
  rendicion: RendicionSeed;
}

export const EJERCICIO_SEED = 2026;

//tres meses que cubren el flujo: uno para cargar y presentar, otro que pasa la auditoría y otro que falla
export function mesesDelSeed(ejercicio = EJERCICIO_SEED): MesSeed[] {
  return [
    {
      mes: 1,
      descripcion: 'en borrador, para probar la carga y la presentación',
      objetivo: 'BORRADOR',
      rendicion: armarRendicion({
        ejercicio,
        mes: 1,
        saldosIniciales: [pesos(1_200_000)],
        cajaInicial: pesos(45_000),
        movimientos: [
          {
            libro: 0,
            dia: 3,
            concepto: 'Coparticipación provincial',
            deposito: pesos(850_000),
          },
          {
            libro: 0,
            dia: 5,
            concepto: 'Sueldos enero',
            retiro: pesos(620_000.5),
          },
          {
            libro: 0,
            dia: 9,
            concepto: 'Tasa de servicios',
            deposito: pesos(132_450.75),
            cajaDebe: pesos(8_000),
          },
          {
            libro: 0,
            dia: 14,
            concepto: 'Combustible',
            retiro: pesos(96_300),
            cajaHaber: pesos(2_500),
          },
          {
            libro: 0,
            dia: 21,
            concepto: 'Proveedor obras viales',
            retiro: pesos(310_000.25),
          },
        ],
      }),
    },
    {
      mes: 2,
      descripcion:
        'presentada, con dos libros banco y todas las reglas en orden',
      objetivo: 'PRESENTADA',
      rendicion: armarRendicion({
        ejercicio,
        mes: 2,
        saldosIniciales: [pesos(1_156_150.25), pesos(240_000)],
        cajaInicial: pesos(50_500),
        movimientos: [
          {
            libro: 0,
            dia: 2,
            concepto: 'Coparticipación provincial',
            deposito: pesos(910_000),
          },
          {
            libro: 1,
            dia: 4,
            concepto: 'Fondo educativo',
            deposito: pesos(180_000),
          },
          {
            libro: 0,
            dia: 6,
            concepto: 'Sueldos febrero',
            retiro: pesos(640_200),
          },
          {
            libro: 1,
            dia: 8,
            concepto: 'Insumos escolares',
            retiro: pesos(72_340.4),
            cajaHaber: pesos(1_800),
          },
          {
            libro: 0,
            dia: 12,
            concepto: 'Tasa de servicios',
            deposito: pesos(141_900.1),
            cajaDebe: pesos(6_200),
          },
          {
            libro: 0,
            dia: 18,
            concepto: 'Mantenimiento de alumbrado',
            retiro: pesos(88_000),
          },
          {
            libro: 1,
            dia: 25,
            concepto: 'Transferencia a la cooperadora',
            retiro: pesos(40_000),
          },
        ],
      }),
    },
    {
      mes: 3,
      descripcion:
        'presentada con errores: saldo del banco mal (V3) y saldo de caja mal (V1)',
      objetivo: 'PRESENTADA',
      rendicion: armarRendicion({
        ejercicio,
        mes: 3,
        saldosIniciales: [pesos(1_390_550)],
        cajaInicial: pesos(54_900),
        movimientos: [
          {
            libro: 0,
            dia: 3,
            concepto: 'Coparticipación provincial',
            deposito: pesos(905_000),
          },
          {
            libro: 0,
            dia: 7,
            concepto: 'Sueldos marzo',
            retiro: pesos(655_000),
          },
          {
            libro: 0,
            dia: 11,
            concepto: 'Tasa de servicios',
            deposito: pesos(128_700),
            cajaDebe: pesos(5_400),
          },
          {
            libro: 0,
            dia: 16,
            concepto: 'Repuestos de maquinaria',
            retiro: pesos(214_999.99),
            cajaHaber: pesos(3_100),
          },
          {
            libro: 0,
            dia: 20,
            concepto: 'Servicio de recolección',
            retiro: pesos(118_000),
          },
          {
            libro: 0,
            dia: 27,
            concepto: 'Multas de tránsito',
            deposito: pesos(22_350),
          },
        ],
        errores: {
          bancoSaldo: { libro: 0, indice: 3, diferencia: pesos(10_000) },
          cajaSaldo: { indice: 4, diferencia: pesos(-1_500) },
        },
      }),
    },
  ];
}
