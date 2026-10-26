import { quitarSeparadoresDni } from '@/features/auth/types';
import type {
  AccionActividad,
  FiltrosActividad,
  ResultadoActividad,
} from '../types';

/** Lo que el usuario escribe en el formulario: todo texto, vacío = sin filtrar. */
export interface FormularioFiltros {
  /** `datetime-local`: AAAA-MM-DDThh:mm */
  desde: string;
  hasta: string;
  accion: string;
  resultado: string;
  dni: string;
  usuarioId: string;
  organismoId: string;
  cuentaMensualId: string;
  entidadTipo: string;
  entidadId: string;
}

export const FORMULARIO_VACIO: FormularioFiltros = {
  desde: '',
  hasta: '',
  accion: '',
  resultado: '',
  dni: '',
  usuarioId: '',
  organismoId: '',
  cuentaMensualId: '',
  entidadTipo: '',
  entidadId: '',
};

export type ResultadoFiltros =
  | { filtros: FiltrosActividad; error?: undefined }
  | { filtros?: undefined; error: string };

const ENTERO_POSITIVO = /^\d+$/;

function entero(valor: string, nombre: string): number | string {
  const limpio = valor.trim();
  if (!ENTERO_POSITIVO.test(limpio) || Number(limpio) < 1) {
    return `${nombre} debe ser un número entero positivo`;
  }
  return Number(limpio);
}

/** Un instante de `datetime-local` (hora local) como ISO con offset, que es lo que pide el servidor. */
function aIso(valor: string, nombre: string): string | { error: string } {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime())
    ? { error: `${nombre} no es una fecha válida` }
    : fecha.toISOString();
}

/** Valida el formulario y arma los filtros del servidor; solo incluye los que se completaron. */
export function aFiltros(formulario: FormularioFiltros): ResultadoFiltros {
  const filtros: FiltrosActividad = {};

  for (const [campo, etiqueta] of [
    ['desde', 'Desde'],
    ['hasta', 'Hasta'],
  ] as const) {
    if (!formulario[campo]) continue;
    const iso = aIso(formulario[campo], etiqueta);
    if (typeof iso !== 'string') return iso;
    filtros[campo] = iso;
  }
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    return { error: '«Desde» no puede ser posterior a «Hasta»' };
  }

  const dni = quitarSeparadoresDni(formulario.dni);
  if (dni) {
    if (!/^\d{7,8}$/.test(dni))
      return { error: 'El DNI debe tener 7 u 8 dígitos' };
    filtros.dni = dni;
  }

  if (formulario.accion) filtros.accion = formulario.accion as AccionActividad;
  if (formulario.resultado) {
    filtros.resultado = formulario.resultado as ResultadoActividad;
  }
  if (formulario.entidadTipo.trim()) {
    filtros.entidadTipo = formulario.entidadTipo.trim();
  }

  for (const [campo, etiqueta] of [
    ['usuarioId', 'El usuario'],
    ['organismoId', 'El organismo'],
    ['cuentaMensualId', 'La rendición'],
    ['entidadId', 'El id de la entidad'],
  ] as const) {
    if (!formulario[campo].trim()) continue;
    const valor = entero(formulario[campo], etiqueta);
    if (typeof valor === 'string') return { error: valor };
    filtros[campo] = valor;
  }

  return { filtros };
}

/** Cuántos filtros hay activos, para mostrarlo junto al botón de «Más filtros». */
export function contarFiltros(filtros: FiltrosActividad): number {
  return Object.keys(filtros).length;
}
