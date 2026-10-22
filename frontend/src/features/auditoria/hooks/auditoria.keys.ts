export const auditoriaKeys = {
  all: ['auditoria'] as const,
  resultados: (cuentaMensualId: number) =>
    [...auditoriaKeys.all, 'resultados', cuentaMensualId] as const,
};
