export const raciKeys = {
  all: ['raci'] as const,
  porCuenta: (cuentaMensualId: number) =>
    [...raciKeys.all, cuentaMensualId] as const,
};
