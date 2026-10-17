import * as XLSX from 'xlsx';

import type { FilaPreview, ResultadoParseo, TransaccionPayload } from '../types';

type Celda = unknown;

const MAX_MONTO = 999_999_999_999.99;
const FILAS_ENCABEZADO_INSTITUCIONAL = 10;
const ETIQUETAS = [
  'fecha',
  'cheque',
  'a la orden de',
  'depositos',
  'retiro',
  'saldo',
] as const;
type Etiqueta = (typeof ETIQUETAS)[number];

export class LibroBancoParseError extends Error {}

/** Minúsculas, sin acentos y con espacios colapsados, para comparar rótulos. */
function norm(valor: Celda): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[:.]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function vacia(celda: Celda): boolean {
  return celda === null || celda === undefined || String(celda).trim() === '';
}

function extraerNumeroCuentaCte(filas: Celda[][]): string | undefined {
  const regex =
    /cta\.?\s*cte\.?(?:\s*(?:n[°º]|n\.|nro\.?|n[uú]mero))?[\s:]*([\w./-]+)?/i;

  for (const fila of filas.slice(0, FILAS_ENCABEZADO_INSTITUCIONAL)) {
    for (let i = 0; i < fila.length; i++) {
      const celda = fila[i];
      if (typeof celda !== 'string') continue;
      const match = regex.exec(celda);
      if (!match) continue;
      if (match[1]) return match[1];
      // El número puede estar en la celda siguiente de la misma fila.
      const siguiente = fila.slice(i + 1).find((c) => !vacia(c));
      if (siguiente !== undefined) return String(siguiente).trim();
    }
  }
  return undefined;
}

function buscarEncabezado(
  filas: Celda[][],
): { indice: number; columnas: Record<Etiqueta, number> } | null {
  for (let indice = 0; indice < filas.length; indice++) {
    const normalizadas = filas[indice].map(norm);
    const columnas = {} as Record<Etiqueta, number>;
    let completo = true;
    for (const etiqueta of ETIQUETAS) {
      const columna = normalizadas.indexOf(etiqueta);
      if (columna === -1) {
        completo = false;
        break;
      }
      columnas[etiqueta] = columna;
    }
    if (completo) return { indice, columnas };
  }
  return null;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fechaISO(celda: Celda): { valor?: string; error?: string } {
  if (vacia(celda)) return {};

  if (typeof celda === 'number') {
    const f = XLSX.SSF.parse_date_code(celda);
    if (!f || f.y < 1900) return { error: 'Fecha inválida' };
    return { valor: `${f.y}-${pad(f.m)}-${pad(f.d)}` };
  }

  if (celda instanceof Date) {
    return {
      valor: `${celda.getFullYear()}-${pad(celda.getMonth() + 1)}-${pad(celda.getDate())}`,
    };
  }

  const texto = String(celda).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (iso) return { valor: `${iso[1]}-${iso[2]}-${iso[3]}` };

  const latina = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(texto);
  if (latina) {
    const dia = Number(latina[1]);
    const mes = Number(latina[2]);
    let anio = Number(latina[3]);
    if (anio < 100) anio += 2000;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      return { error: `Fecha inválida: "${texto}"` };
    }
    return { valor: `${anio}-${pad(mes)}-${pad(dia)}` };
  }

  return { valor: texto };
}

/**
 * Convierte un valor de celda a número. Tolera "1.234,56" (formato es-AR) y
 * "1,234.56". Devuelve NaN si no es un número.
 */
function aNumero(celda: Celda): number {
  if (typeof celda === 'number') return celda;
  const texto = String(celda ?? '')
    .replace(/[$\s]/g, '')
    .trim();
  if (texto === '') return NaN;

  let normalizado = texto;
  if (texto.includes(',')) {
    // La coma es el decimal; los puntos son separadores de miles.
    normalizado = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(texto)) {
    // Varios grupos de 3 dígitos separados por punto: solo pueden ser miles.
    normalizado = texto.replace(/\./g, '');
  }
  return /^-?\d+(\.\d+)?$/.test(normalizado) ? Number(normalizado) : NaN;
}

interface OpcionesMonto {
  vacioEsCero: boolean;
  permitirNegativo: boolean;
}

function monto(
  celda: Celda,
  nombre: string,
  errores: string[],
  { vacioEsCero, permitirNegativo }: OpcionesMonto,
): number {
  // Una celda vacía en depósitos/retiro es un 0 contable.
  if (vacia(celda) && vacioEsCero) return 0;

  const valor = aNumero(celda);
  if (Number.isNaN(valor)) {
    errores.push(`${nombre} no es un número`);
  } else if (!permitirNegativo && valor < 0) {
    errores.push(`${nombre} no puede ser negativo`);
  } else if (Math.abs(valor) > MAX_MONTO) {
    errores.push(`${nombre} excede el máximo permitido`);
  }
  return valor;
}

function texto(celda: Celda): string {
  return vacia(celda) ? '' : String(celda).trim();
}

/**
 * Lee un Libro Banco (.xlsx o .csv) en memoria y lo transforma al formato que
 * espera la API. No lanza por filas inválidas: las devuelve marcadas con
 * `errores` para que la vista previa las muestre. Lanza `LibroBancoParseError`
 * si el archivo no tiene la estructura esperada.
 */
export function parseLibroBanco(buffer: ArrayBuffer): ResultadoParseo {
  let filas: Celda[][];
  try {
    // `raw: true` evita que SheetJS adivine fechas/números en CSV (dd/mm vs mm/dd).
    const libro = XLSX.read(buffer, { type: 'array', raw: true });
    const hoja = libro.Sheets[libro.SheetNames[0]];
    if (!hoja) throw new Error('vacío');
    filas = XLSX.utils.sheet_to_json<Celda[]>(hoja, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
  } catch {
    throw new LibroBancoParseError(
      'No se pudo leer el archivo. Verifique que sea un .xlsx o .csv válido.',
    );
  }

  const encabezado = buscarEncabezado(filas);
  if (!encabezado) {
    throw new LibroBancoParseError(
      'No se encontró la fila de encabezado (FECHA, CHEQUE, A LA ORDEN DE, DEPOSITOS, RETIRO, SALDO).',
    );
  }

  const { columnas } = encabezado;
  const resultado: FilaPreview[] = [];

  for (let i = encabezado.indice + 1; i < filas.length; i++) {
    const fila = filas[i];
    // La tabla termina en la primera fila completamente vacía.
    if (fila.every(vacia)) break;

    const errores: string[] = [];
    const fecha = fechaISO(fila[columnas.fecha]);
    if (fecha.error) errores.push(fecha.error);

    const aLaOrdenDe = texto(fila[columnas['a la orden de']]);
    if (!aLaOrdenDe) errores.push('"A la orden de" es obligatorio');

    const cheque = texto(fila[columnas.cheque]);
    const transaccion: TransaccionPayload = {
      ...(fecha.valor ? { fecha: fecha.valor } : {}),
      ...(cheque ? { cheque } : {}),
      aLaOrdenDe,
      depositos: monto(fila[columnas.depositos], 'Depósitos', errores, {
        vacioEsCero: true,
        permitirNegativo: false,
      }),
      retiro: monto(fila[columnas.retiro], 'Retiro', errores, {
        vacioEsCero: true,
        permitirNegativo: false,
      }),
      saldo: monto(fila[columnas.saldo], 'Saldo', errores, {
        vacioEsCero: false,
        permitirNegativo: true,
      }),
    };
    resultado.push({ fila: i + 1, transaccion, errores });
  }

  if (resultado.length === 0) {
    throw new LibroBancoParseError(
      'El archivo no contiene transacciones debajo del encabezado.',
    );
  }

  return {
    numeroCuentaCte: extraerNumeroCuentaCte(filas),
    filas: resultado,
  };
}
