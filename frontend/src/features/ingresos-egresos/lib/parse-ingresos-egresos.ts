import * as XLSX from 'xlsx';

import {
  aNumero,
  fechaISO,
  MAX_MONTO,
  texto,
  vacia,
  type Celda,
} from '@/lib/celdas-excel';
import type {
  FilaIngresoEgresoPreview,
  ResultadoParseoIngresosEgresos,
  TransaccionIngresoEgreso,
} from '../types';

/** Las 3 primeras filas son cabeceras anidadas; los datos empiezan en la 4. */
const FILAS_ENCABEZADO = 3;

/** Posición de cada columna de la planilla. */
const COL = {
  fecha: 0,
  concepto: 1,
  cheque: 2,
  comprobante: 3,
  cajaDebe: 4,
  cajaHaber: 5,
  cajaSaldo: 6,
  bancoDebe: 7,
  bancoHaber: 8,
  bancoSaldo: 9,
  egresoInc1: 10,
  egresoInc2: 11,
  egresoInc3: 12,
  egresoInc4: 13,
  egresoInc5: 14,
  ingresoMunicipal: 15,
  ingresoOtras: 16,
  cuentasVariasConcepto: 17,
  cuentasVariasDebe: 18,
  cuentasVariasHaber: 19,
} as const;

const ETIQUETA_MONTO = {
  cajaDebe: 'Caja debe',
  cajaHaber: 'Caja haber',
  cajaSaldo: 'Caja saldo',
  bancoDebe: 'Banco debe',
  bancoHaber: 'Banco haber',
  bancoSaldo: 'Banco saldo',
  egresoInc1: 'Egreso inc. 1',
  egresoInc2: 'Egreso inc. 2',
  egresoInc3: 'Egreso inc. 3',
  egresoInc4: 'Egreso inc. 4',
  egresoInc5: 'Egreso inc. 5',
  ingresoMunicipal: 'Ingreso municipal',
  ingresoOtras: 'Ingreso otras',
  cuentasVariasDebe: 'Cuentas varias debe',
  cuentasVariasHaber: 'Cuentas varias haber',
} as const;

type CampoMonto = keyof typeof ETIQUETA_MONTO;

const CAMPOS_MONTO = Object.keys(ETIQUETA_MONTO) as CampoMonto[];
/** Solo los saldos pueden ser negativos. */
const CAMPOS_SALDO: ReadonlySet<CampoMonto> = new Set([
  'cajaSaldo',
  'bancoSaldo',
]);

export class IngresosEgresosParseError extends Error {}

/** Celda vacía o nula = 0 contable; si no es un número devuelve NaN. */
export function limpiarMonto(celda: Celda): number {
  return vacia(celda) ? 0 : aNumero(celda);
}

/**
 * Transforma las filas de la hoja (array de arrays, ya sin las cabeceras) en
 * transacciones. `primeraFila` es el número de la primera fila en la planilla.
 * No lanza por filas inválidas: las devuelve con `errores`.
 */
export function filasATransacciones(
  filas: Celda[][],
  primeraFila = FILAS_ENCABEZADO + 1,
): FilaIngresoEgresoPreview[] {
  const resultado: FilaIngresoEgresoPreview[] = [];

  filas.forEach((celdas, indice) => {
    // Las filas totalmente vacías (separadores o final de hoja) se ignoran.
    if (celdas.every(vacia)) return;

    const errores: string[] = [];

    const fecha = fechaISO(celdas[COL.fecha]);
    if (fecha.error) errores.push(fecha.error);
    else if (!fecha.valor) errores.push('La fecha es obligatoria');

    const concepto = texto(celdas[COL.concepto]);
    if (!concepto) errores.push('El concepto es obligatorio');

    const montos = {} as Record<CampoMonto, number>;
    for (const campo of CAMPOS_MONTO) {
      const nombre = ETIQUETA_MONTO[campo];
      const valor = limpiarMonto(celdas[COL[campo]]);
      if (Number.isNaN(valor)) {
        errores.push(`${nombre} no es un número`);
      } else if (!CAMPOS_SALDO.has(campo) && valor < 0) {
        errores.push(`${nombre} no puede ser negativo`);
      } else if (Math.abs(valor) > MAX_MONTO) {
        errores.push(`${nombre} excede el máximo permitido`);
      }
      montos[campo] = valor;
    }

    const cheque = texto(celdas[COL.cheque]);
    const comprobante = texto(celdas[COL.comprobante]);
    const cuentasVariasConcepto = texto(celdas[COL.cuentasVariasConcepto]);

    const transaccion: TransaccionIngresoEgreso = {
      fila: primeraFila + indice,
      fecha: fecha.valor ?? '',
      concepto,
      ...(cheque ? { cheque } : {}),
      ...(comprobante ? { comprobante } : {}),
      ...montos,
      ...(cuentasVariasConcepto ? { cuentasVariasConcepto } : {}),
    };
    resultado.push({ transaccion, errores });
  });

  return resultado;
}

/**
 * Lee el Excel de Ingresos y Egresos (primera hoja) en memoria. Ignora las 3
 * filas de cabecera y devuelve las filas de datos transformadas, marcando con
 * `errores` las que no se podrían enviar. Lanza `IngresosEgresosParseError` si
 * no se puede leer el archivo o no tiene datos.
 */
export async function parseIngresosEgresosExcel(
  file: File,
): Promise<ResultadoParseoIngresosEgresos> {
  let filas: Celda[][];
  try {
    const libro = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
      raw: true,
    });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    if (!hoja) throw new Error('vacío');
    filas = XLSX.utils.sheet_to_json<Celda[]>(hoja, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
  } catch {
    throw new IngresosEgresosParseError(
      'No se pudo leer el archivo. Verifique que sea un .xlsx o .csv válido.',
    );
  }

  const transacciones = filasATransacciones(filas.slice(FILAS_ENCABEZADO));
  if (transacciones.length === 0) {
    throw new IngresosEgresosParseError(
      'El archivo no contiene filas de datos debajo de las 3 filas de encabezado.',
    );
  }
  return { filas: transacciones };
}
