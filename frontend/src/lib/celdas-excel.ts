import * as XLSX from 'xlsx';

/** Valor crudo de una celda tal como lo entrega SheetJS. */
export type Celda = unknown;

/** Tope de `numeric(14,2)` en la base de datos. */
export const MAX_MONTO = 999_999_999_999.99;

export function vacia(celda: Celda): boolean {
  return celda === null || celda === undefined || String(celda).trim() === '';
}

export function texto(celda: Celda): string {
  return vacia(celda) ? '' : String(celda).trim();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Convierte una celda de fecha (serial de Excel, Date o texto) a `YYYY-MM-DD`. */
export function fechaISO(celda: Celda): { valor?: string; error?: string } {
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

  const cadena = String(celda).trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(cadena);
  if (iso) return { valor: `${iso[1]}-${iso[2]}-${iso[3]}` };

  const latina = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(cadena);
  if (latina) {
    const dia = Number(latina[1]);
    const mes = Number(latina[2]);
    let anio = Number(latina[3]);
    if (anio < 100) anio += 2000;
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      return { error: `Fecha inválida: "${cadena}"` };
    }
    return { valor: `${anio}-${pad(mes)}-${pad(dia)}` };
  }

  return { valor: cadena };
}

/**
 * Convierte un valor de celda a número. Tolera "1.234,56" (formato es-AR) y
 * "1,234.56". Devuelve NaN si no es un número.
 */
export function aNumero(celda: Celda): number {
  if (typeof celda === 'number') return celda;
  const cadena = String(celda ?? '')
    .replace(/[$\s]/g, '')
    .trim();
  if (cadena === '') return NaN;

  let normalizado = cadena;
  if (cadena.includes(',')) {
    // La coma es el decimal; los puntos son separadores de miles.
    normalizado = cadena.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(\.\d{3}){2,}$/.test(cadena)) {
    // Varios grupos de 3 dígitos separados por punto: solo pueden ser miles.
    normalizado = cadena.replace(/\./g, '');
  }
  return /^-?\d+(\.\d+)?$/.test(normalizado) ? Number(normalizado) : NaN;
}
