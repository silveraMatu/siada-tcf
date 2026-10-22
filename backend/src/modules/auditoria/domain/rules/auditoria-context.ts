import type { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';

//datos ya cargados sobre los que corren las reglas
export interface AuditoriaContext {
  cuentaMensualId: number;
  librosBanco: LibroBanco[];
}
