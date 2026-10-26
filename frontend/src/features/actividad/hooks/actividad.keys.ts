import type { FiltrosActividad } from '../types';

export const actividadKeys = {
  all: ['actividad'] as const,
  lista: (filtros: FiltrosActividad) =>
    [...actividadKeys.all, 'lista', filtros] as const,
};
