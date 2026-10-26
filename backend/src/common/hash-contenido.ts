import { createHash } from 'node:crypto';

//sha256 (hex) de un contenido ya ordenado: quien lo llama arma arreglos de campos en orden fijo, así el mismo
//documento da siempre el mismo hash y cualquier cambio de un dato lo cambia
export function calcularHashContenido(valores: unknown): string {
  return createHash('sha256').update(JSON.stringify(valores)).digest('hex');
}
