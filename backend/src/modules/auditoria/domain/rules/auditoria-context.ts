import type { IngresosEgresos } from '../../../ingresos-egresos/domain/entities/ingresos-egresos.domain.js';
import type { LibroBanco } from '../../../libro-banco/domain/entities/libro-banco.domain.js';
import type { Raci } from '../../../raci/domain/entities/raci.domain.js';

//datos ya cargados sobre los que corren las reglas; los libros son opcionales porque
//el motor valida de forma progresiva con lo que haya
export interface AuditoriaContext {
  cuentaMensualId: number;
  librosBanco?: LibroBanco[]; //vacío cuenta como libro faltante
  ingresosEgresos?: IngresosEgresos;
  raci?: Raci;
  //mes y ejercicio de la rendición: las reglas de fechas lo comparan con las fechas de las filas; sin período
  //no pueden evaluar
  periodo?: PeriodoRendicion;
}

export interface PeriodoRendicion {
  ejercicioFiscal: number;
  mes: number; //1 a 12
}
