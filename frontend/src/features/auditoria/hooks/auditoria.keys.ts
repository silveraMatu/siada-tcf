export const auditoriaKeys = {
  all: ['auditoria'] as const,
  ejecucion: (cuentaMensualId: number) =>
    [...auditoriaKeys.all, 'ejecucion', cuentaMensualId] as const,
};
