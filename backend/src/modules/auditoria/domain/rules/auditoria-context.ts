import type { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';

//datos ya cargados sobre los que corren las reglas; los libros son opcionales porque
//el motor valida de forma progresiva con lo que haya
export interface AuditoriaContext {
  cuentaMensualId: number;
  librosBanco?: LibroBanco[]; //vacío cuenta como libro faltante
}
