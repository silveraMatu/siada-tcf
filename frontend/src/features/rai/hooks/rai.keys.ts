export const raiKeys = {
  all: ['rai'] as const,
  porCuenta: (cuentaMensualId: number) =>
    [...raiKeys.all, cuentaMensualId] as const,
};
