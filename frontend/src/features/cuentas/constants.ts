import type { EstadoCuentaMensual } from './types';

export const EJERCICIOS_FISCALES = Array.from(
  { length: 11 },
  (_, i) => 2020 + i,
);

export const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export const ESTADOS: Record<
  EstadoCuentaMensual,
  { label: string; className: string }
> = {
  pendiente_carga: {
    label: 'Pendiente de Carga',
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  cargada: {
    label: 'Cargada',
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  lista_para_auditar: {
    label: 'Lista para Auditar',
    className: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  },
  con_observaciones: {
    label: 'Con Observaciones',
    className: 'border-orange-200 bg-orange-50 text-orange-700',
  },
  auditada: {
    label: 'Auditada',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  rechazada: {
    label: 'Rechazada',
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  cerrada: {
    label: 'Cerrada',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
};
