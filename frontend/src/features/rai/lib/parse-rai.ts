import * as XLSX from 'xlsx';

import {
  aNumero,
  MAX_MONTO,
  texto,
  vacia,
  type Celda,
} from '@/lib/celdas-excel';
import type {
  FilaRaiPreview,
  ResultadoParseoRai,
  TransaccionRai,
} from '../types';

/** Posición de cada columna de la planilla (A–I). La fecha son dos celdas: día (B) y mes (C). */
const COL = {
  asiento: 0,
  dia: 1,
  mes: 2,
  planillaNumero: 3,
  concepto: 4,
  ingresosDiarios: 5,
  ingresosMensuales: 6,
  ingresosAcumulados: 7,
  saldo: 8,
} as const;

const MAX_ASIENTO = 2_147_483_647;

/** Importes que la API exige y que admiten signo: salen de las fórmulas de la planilla. */
const ACUMULADOS = {
  ingresosMensuales: 'Ingresos mensuales',
  ingresosAcumulados: 'Ingresos acumulados',
  saldo: 'Saldo',
} as const;

/** Cuántas filas del encabezado se recorren buscando «EJERCICIO FISCAL ####». */
const FILAS_DE_ENCABEZADO = 15;

export class RaiParseError extends Error {}

/** Minúsculas, sin acentos, sin «:» ni «.» finales y con los espacios colapsados. */
function norm(celda: Celda): string {
  return texto(celda)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[:.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fila de títulos: «Asto. N°» en A y «CONCEPTO» en E. La siguiente solo continúa los títulos combinados. */
function esFilaDeTitulos(celdas: Celda[]): boolean {
  return (
    /^asto\.? ?n[°º]?$/.test(norm(celdas[COL.asiento])) &&
    norm(celdas[COL.concepto]) === 'concepto'
  );
}

/** Año del «EJERCICIO FISCAL ####» del encabezado, si la planilla lo trae. */
function ejercicioDelEncabezado(filas: Celda[][]): number | undefined {
  for (const celdas of filas.slice(0, FILAS_DE_ENCABEZADO)) {
    for (const celda of celdas ?? []) {
      const m = /ejercicio\s+fiscal\s*(\d{4})/i.exec(texto(celda));
      if (m) return Number(m[1]);
    }
  }
  return undefined;
}

/** Celda vacía = 0; si no es un número devuelve NaN. */
function importe(celda: Celda): number {
  return vacia(celda) ? 0 : aNumero(celda);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** `dia` y `mes` de la planilla más el año del ejercicio, si forman una fecha real del calendario. */
function armarFecha(
  anio: number,
  dia: number,
  mes: number,
): string | undefined {
  const f = new Date(Date.UTC(anio, mes - 1, dia));
  const real =
    f.getUTCFullYear() === anio &&
    f.getUTCMonth() === mes - 1 &&
    f.getUTCDate() === dia;
  return real ? `${anio}-${pad(mes)}-${pad(dia)}` : undefined;
}

/**
 * Transforma las filas de la hoja (array de arrays, con sus encabezados) en asientos. Los asientos
 * están debajo de la fila de títulos. Se omiten (y se cuentan) la fila «transporte» y las filas sin usar,
 * que no tienen datos de entrada en A–F aunque sus fórmulas de G a I sigan arrastrando el último valor.
 * La fecha se arma con el día y el mes de la planilla y el ejercicio de la rendición. No lanza por filas
 * inválidas: las devuelve con `errores`. Lanza `RaiParseError` si no encuentra la fila de títulos.
 */
export function filasARai(
  filas: Celda[][],
  ejercicioFiscal: number,
): ResultadoParseoRai {
  const indiceTitulos = filas.findIndex((celdas) =>
    esFilaDeTitulos(celdas ?? []),
  );
  if (indiceTitulos === -1) {
    throw new RaiParseError(
      'No se encontró la fila de títulos del RAI («Asto. N°» y «CONCEPTO»).',
    );
  }

  const resultado: FilaRaiPreview[] = [];
  let omitidas = 0;

  for (let i = indiceTitulos + 1; i < filas.length; i++) {
    const celdas = filas[i] ?? [];
    const concepto = texto(celdas[COL.concepto]);

    // la fila que continúa los títulos combinados (fila 17 de la planilla) no tiene datos y no se cuenta
    if (i === indiceTitulos + 1 && celdas.every(vacia)) continue;

    const esTransporte = norm(celdas[COL.concepto]) === 'transporte';
    const hayDatosDeEntrada = [
      COL.asiento,
      COL.dia,
      COL.mes,
      COL.planillaNumero,
      COL.concepto,
      COL.ingresosDiarios,
    ].some((col) => !vacia(celdas[col]));

    if (esTransporte || !hayDatosDeEntrada) {
      omitidas++;
      continue;
    }

    const errores: string[] = [];

    // asiento: opcional, pero si viene tiene que ser un entero positivo
    let asiento: number | undefined;
    if (!vacia(celdas[COL.asiento])) {
      const n = aNumero(celdas[COL.asiento]);
      if (!Number.isInteger(n) || n <= 0 || n > MAX_ASIENTO) {
        errores.push('El N° de asiento debe ser un entero positivo');
      } else asiento = n;
    }

    // fecha: día y mes de la planilla + año del ejercicio de la rendición
    let fecha: string | undefined;
    const diaVacio = vacia(celdas[COL.dia]);
    const mesVacio = vacia(celdas[COL.mes]);
    if (diaVacio) errores.push('El día es obligatorio');
    if (mesVacio) errores.push('El mes es obligatorio');
    if (!diaVacio && !mesVacio) {
      const dia = aNumero(celdas[COL.dia]);
      const mes = aNumero(celdas[COL.mes]);
      if (!Number.isInteger(dia) || !Number.isInteger(mes)) {
        errores.push('El día y el mes deben ser números enteros');
      } else {
        fecha = armarFecha(ejercicioFiscal, dia, mes);
        if (!fecha) errores.push(`Fecha inválida: ${pad(dia)}/${pad(mes)}`);
      }
    }

    if (!concepto) errores.push('El concepto es obligatorio');

    // ingresos del día: opcional (vacío = 0) y nunca negativo
    const diarios = importe(celdas[COL.ingresosDiarios]);
    if (Number.isNaN(diarios)) errores.push('Ingresos diarios no es un número');
    else if (diarios < 0)
      errores.push('Ingresos diarios no puede ser negativo');
    else if (diarios > MAX_MONTO) {
      errores.push('Ingresos diarios excede el máximo permitido');
    }

    const acumulados = {} as Record<keyof typeof ACUMULADOS, number>;
    for (const campo of Object.keys(
      ACUMULADOS,
    ) as (keyof typeof ACUMULADOS)[]) {
      const nombre = ACUMULADOS[campo];
      const celda = celdas[COL[campo]];
      const valor = vacia(celda) ? NaN : aNumero(celda);
      if (vacia(celda)) errores.push(`${nombre} es obligatorio`);
      else if (Number.isNaN(valor)) errores.push(`${nombre} no es un número`);
      else if (Math.abs(valor) > MAX_MONTO) {
        errores.push(`${nombre} excede el máximo permitido`);
      }
      acumulados[campo] = valor;
    }

    const planillaNumero = texto(celdas[COL.planillaNumero]);
    const transaccion: TransaccionRai = {
      ...(asiento !== undefined ? { asiento } : {}),
      fecha: fecha ?? '',
      ...(planillaNumero ? { planillaNumero } : {}),
      concepto,
      ingresosDiarios: diarios,
      ingresosMensuales: acumulados.ingresosMensuales,
      ingresosAcumulados: acumulados.ingresosAcumulados,
      saldo: acumulados.saldo,
    };

    resultado.push({ fila: i + 1, transaccion, errores });
  }

  return {
    filas: resultado,
    omitidas,
    ejercicioDeLaPlanilla: ejercicioDelEncabezado(filas),
  };
}

/**
 * Lee la planilla del RAI (primera hoja, .xls, .xlsx o .csv) en memoria y devuelve los asientos,
 * marcando con `errores` los que no se podrían enviar. `ejercicioFiscal` es el de la rendición: la
 * planilla no trae el año en cada asiento. Lanza `RaiParseError` si no se puede leer el archivo, la
 * hoja no tiene la estructura esperada o no trae asientos.
 */
export async function parseRaiExcel(
  file: File,
  ejercicioFiscal: number,
): Promise<ResultadoParseoRai> {
  let filas: Celda[][];
  let nombreHoja: string;
  try {
    const libro = XLSX.read(await file.arrayBuffer(), {
      type: 'array',
      raw: true,
    });
    nombreHoja = libro.SheetNames[0];
    const hoja = libro.Sheets[nombreHoja];
    if (!hoja) throw new Error('vacío');
    filas = XLSX.utils.sheet_to_json<Celda[]>(hoja, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
  } catch {
    throw new RaiParseError(
      'No se pudo leer el archivo. Verifique que sea un .xls, .xlsx o .csv válido.',
    );
  }

  let resultado: ResultadoParseoRai;
  try {
    resultado = filasARai(filas, ejercicioFiscal);
  } catch (e) {
    if (!(e instanceof RaiParseError)) throw e;
    throw new RaiParseError(
      `${e.message} Se lee la primera hoja del archivo («${nombreHoja}»): verifique que sea la que tiene los asientos.`,
    );
  }

  if (resultado.filas.length === 0) {
    throw new RaiParseError(
      `La primera hoja del archivo («${nombreHoja}») no tiene asientos cargados. Complete al menos uno con su día, mes y concepto.`,
    );
  }
  return resultado;
}
