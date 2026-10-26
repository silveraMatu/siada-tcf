export const ingresosEgresosKeys = {
  all: ['ingresos-egresos'] as const,
  porCuenta: (cuentaMensualId: number) =>
    [...ingresosEgresosKeys.all, cuentaMensualId] as const,
};
