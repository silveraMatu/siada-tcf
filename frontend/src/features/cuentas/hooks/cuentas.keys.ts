import type { EstadoCuentaMensual } from '../types';

export const cuentasKeys = {
  all: ['cuentas'] as const,
  todas: () => [...cuentasKeys.all, 'todas'] as const,
  porEstado: (estado: EstadoCuentaMensual) =>
    [...cuentasKeys.all, 'estado', estado] as const,
};
