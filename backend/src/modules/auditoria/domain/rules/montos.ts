//en centavos enteros no hay error de coma flotante
export const aCentavos = (monto: number): number => Math.round(monto * 100);
export const aMonto = (centavos: number): string => (centavos / 100).toFixed(2);

//diferencia tolerada entre un importe calculado y el informado
export const TOLERANCIA_CENTAVOS = 1;
