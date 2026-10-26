import type { IngresosEgresos } from '../../../../ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import type { LibroBanco } from '../../../../libro-banco/domain/entities/libro-banco.domain.js';

export interface DocumentosAuditables {
  librosBanco: LibroBanco[];
  ingresosEgresos?: IngresosEgresos;
}

//los documentos de la rendición sobre los que corre el motor; los aportan los módulos de cada libro
export abstract class DocumentosAuditablesPort {
  abstract cargar(cuentaMensualId: number): Promise<DocumentosAuditables>;
}
