export const libroBancoKeys = {
  all: ['libro-banco'] as const,
  porCuenta: (cuentaMensualId: number) =>
    [...libroBancoKeys.all, cuentaMensualId] as const,
};
