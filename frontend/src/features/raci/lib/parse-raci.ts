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
  FilaRaciPreview,
  ResultadoParseoRaci,
  TransaccionRaci,
} from '../types';

/** Posición de cada columna de la planilla (A–Q). La fecha puede estar en B o en C (título combinado). */
const COL = {
  asiento: 0,
  fecha: 1,
  fechaAlternativa: 2,
  expediente: 3,
  concepto: 4,
  compromisoInstrumentoLegal: 5,
  compromisoDelMes: 6,
  compromisoAcumulado: 7,
  compromisoOrdenProvision: 8,
  devengadoDelMes: 9,
  devengadoAcumulado: 10,
  devengadoSaldo: 11,
  devengadoOrdenPago: 12,
  pagoNumeroCheque: 13,
  pagoDelMes: 14,
  pagoAcumulado: 15,
  pagoSaldoAPagar: 16,
} as const;

const MAX_ASIENTO = 2_147_483_647;

/** Importes «del mes»: opcionales (vacío = 0) y nunca negativos. */
const DEL_MES = {
  compromisoDelMes: 'Compromiso del mes',
  devengadoDelMes: 'Devengado del mes',
  pagoDelMes: 'Pago del mes',
} as const;

/** Acumulados y saldos: la API los exige y admiten signo. */
const ACUMULADOS = {
  compromisoAcumulado: 'Compromiso acumulado',
  devengadoAcumulado: 'Devengado acumulado',
  devengadoSaldo: 'Devengado saldo',
  pagoAcumulado: 'Pago acumulado',
  pagoSaldoAPagar: 'Pago saldo a pagar',
} as const;

const TEXTOS = [
  'expediente',
  'compromisoInstrumentoLegal',
  'compromisoOrdenProvision',
  'devengadoOrdenPago',
  'pagoNumeroCheque',
] as const;

export class RaciParseError extends Error {}

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

/** Fila de títulos de un bloque: «N°» en A y «CONCEPTO» en E. La siguiente («As.») no tiene datos. */
function esFilaDeTitulos(celdas: Celda[]): boolean {
  return (
    /^n[°º]?$/.test(norm(celdas[COL.asiento])) &&
    norm(celdas[COL.concepto]) === 'concepto'
  );
}

/**
 * Encabezado de una partida presupuestaria: marca el fin del bloque anterior. Se reconoce por sus
 * rótulos en las columnas donde la planilla los pone (no por el texto suelto: un concepto podría
 * llamarse «Presupuesto»).
 */
function esEncabezadoDePartida(celdas: Celda[]): boolean {
  return (
    norm(celdas[0]) === 'fecha' ||
    norm(celdas[5]) === 'presupuesto' ||
    norm(celdas[6]) === 'modificaciones' ||
    norm(celdas[8]) === 'total autorizado' ||
    ['finalidad', 'funcion', 'seccion'].includes(norm(celdas[9])) ||
    norm(celdas[12]).startsWith('partida ')
  );
}

/** Valor de la partida: el primer texto a la derecha del rótulo «Partida …» (columna M). */
function valorDePartida(celdas: Celda[]): string | null {
  if (!norm(celdas[12]).startsWith('partida ')) return null;
  const valor = celdas.slice(13).find((c) => !vacia(c));
  return valor === undefined ? null : texto(valor);
}

/** Celda vacía = 0; si no es un número devuelve NaN. */
function importe(celda: Celda): number {
  return vacia(celda) ? 0 : aNumero(celda);
}

/** Fecha real del calendario en formato `YYYY-MM-DD` (la API rechaza «2026-02-31»). */
function esFechaReal(iso: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const f = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return (
    f.getUTCFullYear() === Number(m[1]) &&
    f.getUTCMonth() === Number(m[2]) - 1 &&
    f.getUTCDate() === Number(m[3])
  );
}

/**
 * Transforma las filas de la hoja (array de arrays, con sus encabezados) en asientos. Cada bloque
 * empieza en su fila de títulos y llega hasta el encabezado de la siguiente partida o el final de la
 * hoja: no importa cuántas filas tenga (la plantilla trae 26, pero se pueden agregar o quitar).
 * No lanza por filas inválidas: las devuelve con `errores`. Lanza `RaciParseError` si no encuentra
 * la fila de títulos.
 */
export function filasARaci(filas: Celda[][]): ResultadoParseoRaci {
  const resultado: FilaRaciPreview[] = [];
  let omitidas = 0;
  let encontroTitulos = false;

  let enBloque = false;
  let partidaVista: string[] = [];
  let partida: string | undefined;

  for (let i = 0; i < filas.length; i++) {
    const celdas = filas[i] ?? [];

    if (esFilaDeTitulos(celdas)) {
      encontroTitulos = true;
      enBloque = true;
      partida = partidaVista.length > 0 ? partidaVista.join(' · ') : undefined;
      // la fila de subtítulos («As.», «Del Mes»…) no trae datos
      if (norm(filas[i + 1]?.[COL.asiento]) === 'as') i++;
      continue;
    }

    if (esEncabezadoDePartida(celdas)) {
      // un «FECHA» en la primera columna abre el encabezado de una partida nueva
      if (norm(celdas[COL.asiento]) === 'fecha') partidaVista = [];
      const valor = valorDePartida(celdas);
      if (valor) partidaVista.push(valor);
      enBloque = false;
      continue;
    }

    if (!enBloque) continue;

    const errores: string[] = [];

    const celdaFecha = vacia(celdas[COL.fecha])
      ? celdas[COL.fechaAlternativa]
      : celdas[COL.fecha];
    const hayAsiento = !vacia(celdas[COL.asiento]);
    const hayFecha = !vacia(celdaFecha);
    const concepto = texto(celdas[COL.concepto]);

    const textos = Object.fromEntries(
      TEXTOS.map((campo) => [campo, texto(celdas[COL[campo]])]),
    ) as Record<(typeof TEXTOS)[number], string>;

    const delMes = {} as Record<keyof typeof DEL_MES, number>;
    for (const campo of Object.keys(DEL_MES) as (keyof typeof DEL_MES)[]) {
      delMes[campo] = importe(celdas[COL[campo]]);
    }

    // Datos que carga el responsable: sin ellos la fila es un renglón en blanco o la base del bloque.
    const hayDatosDeEntrada =
      hayAsiento ||
      hayFecha ||
      concepto !== '' ||
      TEXTOS.some((campo) => textos[campo] !== '') ||
      Object.values(delMes).some((v) => Number.isNaN(v) || v !== 0);

    if (!hayDatosDeEntrada) {
      omitidas++;
      continue;
    }

    // asiento
    let asiento = 0;
    if (!hayAsiento) errores.push('El N° de asiento es obligatorio');
    else {
      const n = aNumero(celdas[COL.asiento]);
      if (!Number.isInteger(n) || n <= 0 || n > MAX_ASIENTO) {
        errores.push('El N° de asiento debe ser un entero positivo');
      } else asiento = n;
    }

    // fecha
    const fecha = fechaISO(celdaFecha);
    if (fecha.error) errores.push(fecha.error);
    else if (!hayFecha) errores.push('La fecha es obligatoria');
    else if (fecha.valor && !esFechaReal(fecha.valor)) {
      errores.push(`Fecha inválida: "${fecha.valor}"`);
    }

    if (!concepto) errores.push('El concepto es obligatorio');

    for (const campo of Object.keys(DEL_MES) as (keyof typeof DEL_MES)[]) {
      const valor = delMes[campo];
      const nombre = DEL_MES[campo];
      if (Number.isNaN(valor)) errores.push(`${nombre} no es un número`);
      else if (valor < 0) errores.push(`${nombre} no puede ser negativo`);
      else if (valor > MAX_MONTO)
        errores.push(`${nombre} excede el máximo permitido`);
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

    const transaccion: TransaccionRaci = {
      asiento,
      fecha: fecha.valor ?? '',
      concepto,
      ...(textos.expediente ? { expediente: textos.expediente } : {}),
      ...(textos.compromisoInstrumentoLegal
        ? { compromisoInstrumentoLegal: textos.compromisoInstrumentoLegal }
        : {}),
      compromisoDelMes: delMes.compromisoDelMes,
      compromisoAcumulado: acumulados.compromisoAcumulado,
      ...(textos.compromisoOrdenProvision
        ? { compromisoOrdenProvision: textos.compromisoOrdenProvision }
        : {}),
      devengadoDelMes: delMes.devengadoDelMes,
      devengadoAcumulado: acumulados.devengadoAcumulado,
      devengadoSaldo: acumulados.devengadoSaldo,
      ...(textos.devengadoOrdenPago
        ? { devengadoOrdenPago: textos.devengadoOrdenPago }
        : {}),
      ...(textos.pagoNumeroCheque
        ? { pagoNumeroCheque: textos.pagoNumeroCheque }
        : {}),
      pagoDelMes: delMes.pagoDelMes,
      pagoAcumulado: acumulados.pagoAcumulado,
      pagoSaldoAPagar: acumulados.pagoSaldoAPagar,
    };

    resultado.push({
      fila: i + 1,
      ...(partida ? { partida } : {}),
      transaccion,
      errores,
    });
  }

  if (!encontroTitulos) {
    throw new RaciParseError(
      'No se encontró la fila de títulos del RACI («N°» y «CONCEPTO»).',
    );
  }
  return { filas: resultado, omitidas };
}

/**
 * Lee la planilla del RACI (primera hoja, .xls, .xlsx o .csv) en memoria y devuelve los asientos,
 * marcando con `errores` los que no se podrían enviar. Lanza `RaciParseError` si no se puede leer el
 * archivo o la hoja no tiene la estructura esperada o no trae asientos.
 */
export async function parseRaciExcel(file: File): Promise<ResultadoParseoRaci> {
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
    throw new RaciParseError(
      'No se pudo leer el archivo. Verifique que sea un .xls, .xlsx o .csv válido.',
    );
  }

  let resultado: ResultadoParseoRaci;
  try {
    resultado = filasARaci(filas);
  } catch (e) {
    if (!(e instanceof RaciParseError)) throw e;
    throw new RaciParseError(
      `${e.message} Se lee la primera hoja del archivo («${nombreHoja}»): verifique que sea la que tiene los asientos.`,
    );
  }

  if (resultado.filas.length === 0) {
    throw new RaciParseError(
      `La primera hoja del archivo («${nombreHoja}») no tiene asientos cargados. Complete al menos un asiento con su N°, fecha y concepto.`,
    );
  }
  return resultado;
}
