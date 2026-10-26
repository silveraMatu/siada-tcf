import type { EstadoCuentaMensual, TipoLibro } from './types';

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

export const TIPOS_LIBRO: Record<TipoLibro, string> = {
  LIBRO_BANCO: 'Libro Banco',
  INGRESOS_EGRESOS: 'Ingresos y Egresos',
};

export const ESTADOS: Record<
  EstadoCuentaMensual,
  { label: string; className: string }
> = {
  EN_BORRADOR: {
    label: 'En Borrador',
    className: 'border-warning-border bg-warning-subtle text-warning',
  },
  LISTO_PARA_AUDITAR: {
    label: 'Listo para Auditar',
    className: 'border-review-border bg-review-subtle text-review',
  },
  EN_AUDITORIA: {
    label: 'En Auditoría',
    className: 'border-info-border bg-info-subtle text-info',
  },
  CON_OBSERVACIONES: {
    label: 'Con Observaciones',
    className: 'border-caution-border bg-caution-subtle text-caution',
  },
  AUDITADA: {
    label: 'Auditada',
    className: 'border-success-border bg-success-subtle text-success',
  },
};
