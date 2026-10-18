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
    className: 'border-warning-border bg-warning-subtle text-warning',
  },
  cargada: {
    label: 'Cargada',
    className: 'border-info-border bg-info-subtle text-info',
  },
  lista_para_auditar: {
    label: 'Lista para Auditar',
    className: 'border-review-border bg-review-subtle text-review',
  },
  con_observaciones: {
    label: 'Con Observaciones',
    className: 'border-caution-border bg-caution-subtle text-caution',
  },
  auditada: {
    label: 'Auditada',
    className: 'border-success-border bg-success-subtle text-success',
  },
  rechazada: {
    label: 'Rechazada',
    className: 'border-danger-border bg-danger-subtle text-danger',
  },
  cerrada: {
    label: 'Cerrada',
    className: 'border-inactivo-border bg-inactivo-subtle text-inactivo',
  },
};
