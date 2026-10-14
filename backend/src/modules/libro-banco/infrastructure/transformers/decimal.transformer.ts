import type { ValueTransformer } from 'typeorm';

//convierte los decimales que devuelve postgres de strings a float con parseFloat
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? value : parseFloat(value),
};
